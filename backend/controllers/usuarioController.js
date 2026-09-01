// backend/controllers/usuarioController.js
const supabase = require('../config/database');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const { jwtSecret } = require('../config/auth');
const crypto = require('crypto'); // Biblioteca nativa do Node.js para criptografia

const gerarToken = (usuário) => jwt.sign(
    { id: usuário.id, email: usuário.email, perfil: usuário.perfil },
    jwtSecret,
    { expiresIn: '24h' }
);

// 1. LÓGICA DE cadastro (CADASTRO)
exports.registrar = async (req, res) => {
    const { nome, email, telefone, senha, confirmar_senha, consentimento_termos, consentimento_imagem } = req.body;

    if (!nome || !email || !senha || !confirmar_senha) {
        return res.status(400).json({ erro: 'Nome, e-mail e senha são obrigatórios.' });
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
        return res.status(400).json({ erro: 'Por favor, insira um endereço de e-mail válido.' });
    }

    if (senha.length < 6) {
        return res.status(400).json({ erro: 'A senha deve ter no mínimo 6 caracteres.' });
    }

    // [Funcionalidade 1.2] Validação de Confirmação de Senha
    if (senha !== confirmar_senha) {
        return res.status(400).json({ erro: 'As senhas não coincidem.' });
    }

    // Validação de LGPD
    if (!consentimento_termos) {
        return res.status(400).json({ erro: 'O consentimento dos termos de uso é obrigatório (LGPD).' });
    }

    try {
        // Verificar se o e-mail já existe no Supabase
        const { data: usuárioExistente } = await supabase
            .from('usuarios')
            .select('id')
            .eq('email', email)
            .maybeSingle(); // Devolve o cadastro ou nulo se não encontrar

        if (usuárioExistente) {
            return res.status(400).json({ erro: 'Este e-mail já está em uso.' });
        }

        // Criptografia da senha
        const salt = await bcrypt.genSalt(10);
        const senhaHash = await bcrypt.hash(senha, salt);

        // Inserção de dados no Supabase
        // Nota: O UUID, a data de criação e o perfil 'candidato' são gerados automaticamente pelo Postgres!
        const { data: novoUsuário, error: erroInsercao } = await supabase
            .from('usuarios')
            .insert([
                {
                    nome,
                    email,
                    telefone,
                    senha: senhaHash,
                    consentimento_termos: consentimento_termos === 1 || consentimento_termos === true,
                    consentimento_imagem: consentimento_imagem === 1 || consentimento_imagem === true
                }
            ])
            .select(); // Força o retorno dos dados inseridos

        if (erroInsercao) throw erroInsercao;

        const usuárioCriado = novoUsuário[0];
        const token = gerarToken(usuárioCriado);

        res.status(201).json({
            mensagem: 'Usuário cadastrado e autenticado com sucesso!',
            token,
            usuário: {
                nome: usuárioCriado.nome,
                email: usuárioCriado.email,
                perfil: usuárioCriado.perfil
            }
        });
    } catch (error) {
        console.error('Erro no cadastro:', error.message);
        res.status(500).json({ erro: 'Erro interno ao processar o cadastro.' });
    }
};

// 2. LÓGICA DE LOGIN
exports.login = async (req, res) => {
    const { email, senha } = req.body;

    try {
        // Procurar o usuário pelo e-mail no Supabase
        const { data: usuário, error: erroBusca } = await supabase
            .from('usuarios')
            .select('*')
            .eq('email', email)
            .maybeSingle();

        if (erroBusca) throw erroBusca;
        if (!usuário) return res.status(404).json({ erro: 'Usuário não encontrado.' });

        // [Funcionalidade 2.2] Verificar se o usuário está bloqueado pela administração
        if (usuário.is_bloqueado) {
            return res.status(403).json({ erro: 'Sua conta está temporariamente suspensa. Entre em contato com a coordenação.' });
        }

        // Comparar a senha digitada com o Hash do banco
        const senhaValida = await bcrypt.compare(senha, usuário.senha);
        if (!senhaValida) return res.status(401).json({ erro: 'Senha incorreta.' });

        // Gerar o Token de Autenticação (JWT)
        // Guardamos o 'id' e o 'perfil' (role) dentro do token para o sistema de permissões (RBAC)
        const token = gerarToken(usuário);

        res.json({
            mensagem: 'Login realizado com sucesso!',
            token: token,
            usuário: { nome: usuário.nome, email: usuário.email, perfil: usuário.perfil }
        });
    } catch (error) {
        console.error('Erro no login:', error.message);
        res.status(500).json({ erro: 'Erro interno ao realizar o login.' });
    }
};

// 3. SOLICITAR RECUPERAÇÃO DE senha
exports.solicitarRecuperacao = async (req, res) => {
    const { email } = req.body;

    try {
        // 1. Verificar se o usuário existe
        const { data: usuário, error: erroBusca } = await supabase
            .from('usuarios')
            .select('id, nome')
            .eq('email', email)
            .maybeSingle();

        if (erroBusca) throw erroBusca;
        if (!usuário) {
            // Por segurança, não dizemos se o e-mail existe ou não. Devolvemos sucesso sempre.
            return res.json({ mensagem: 'Se o e-mail existir, você receberá um link de recuperação.' });
        }

        // 2. Gerar Token Aleatório (64 caracteres Hexadecimais)
        const resetToken = crypto.randomBytes(32).toString('hex');

        // 3. Definir expiração (ex: 1 hora a partir de agora)
        const expiraEm = new Date();
        expiraEm.setHours(expiraEm.getHours() + 1);

        // 4. Guardar o token e a expiração no banco
        await supabase
            .from('usuarios')
            .update({
                reset_token: resetToken,
                reset_token_expires: expiraEm.toISOString()
            })
            .eq('id', usuário.id);

        // 5. Simular o envio de E-mail (No mundo real, usaríamos o Nodemailer aqui)
        // Como o Front-end e Back-end dividem a mesma origem, montamos o link dinamicamente
        const linkRecuperacao = `${req.protocol}://${req.get('host')}/redefinir-senha.html?token=${resetToken}`;

        console.log(`\n📧 [SIMULAÇÃO DE E-MAIL]`);
        console.log(`Para: ${email}`);
        console.log(`Assunto: Recuperação de Senha - Connect Senac`);
        console.log(`Link: ${linkRecuperacao}\n`);

        res.json({ mensagem: 'Se o e-mail existir, você receberá um link de recuperação.' });

    } catch (error) {
        console.error('Erro na solicitação de recuperação:', error.message);
        res.status(500).json({ erro: 'Erro interno do servidor.' });
    }
};

// 4. REDEFINIR A senha
exports.redefinirSenha = async (req, res) => {
    const { token, nova_senha, confirmar_senha } = req.body;

    if (nova_senha !== confirmar_senha) {
        return res.status(400).json({ erro: 'As senhas não coincidem.' });
    }

    try {
        // 1. Procurar o usuário que tem este token e verificar se ainda é válido (data > agora)
        const agora = new Date().toISOString();
        const { data: usuário, error: erroBusca } = await supabase
            .from('usuarios')
            .select('id')
            .eq('reset_token', token)
            .gt('reset_token_expires', agora) // Valida se ainda não expirou
            .maybeSingle();

        if (erroBusca || !usuário) {
            return res.status(400).json({ erro: 'O link de recuperação é inválido ou já expirou.' });
        }

        // 2. Gerar o Hash da nova senha
        const salt = await bcrypt.genSalt(10);
        const senhaHash = await bcrypt.hash(nova_senha, salt);

        // 3. Atualizar a senha e limpar os tokens de recuperação
        await supabase
            .from('usuarios')
            .update({
                senha: senhaHash,
                reset_token: null,
                reset_token_expires: null
            })
            .eq('id', usuário.id);

        res.json({ mensagem: 'Senha alterada com sucesso! Já pode fazer login.' });

    } catch (error) {
        console.error('Erro ao redefinir senha:', error.message);
        res.status(500).json({ erro: 'Erro interno ao redefinir a senha.' });
    }
};
