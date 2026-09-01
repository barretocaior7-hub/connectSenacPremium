// backend/controllers/adminController.js
const supabase = require('../config/database');
const bcrypt = require('bcrypt');

// 1. Listar usuarios com metricas (consome a nossa nova View)
exports.listarUsuarios = async (req, res) => {
    try {
        const { data: usuarios, error } = await supabase
            .from('view_usuarios_estatisticas')
            .select('*')
            .order('nome', { ascending: true });

        if (error) throw error;
        res.json(usuarios);
    } catch (error) {
        console.error('Erro ao listar usuarios:', error.message);
        res.status(500).json({ erro: 'Erro ao carregar a lista de usuarios.' });
    }
};

// 2. Bloquear / Desbloquear usuario (Moderacao)
exports.alterarStatusBloqueio = async (req, res) => {
    const { id } = req.params;
    const { is_bloqueado } = req.body;
    const executorPerfil = req.usuario.perfil;
    const executorId = req.usuario.id;

    if (id === executorId) {
        return res.status(400).json({ erro: 'Não pode bloquear a sua própria conta.' });
    }

    try {
        const { data: alvo, error: erroBusca } = await supabase
            .from('usuarios')
            .select('perfil')
            .eq('id', id)
            .single();

        if (erroBusca || !alvo) return res.status(404).json({ erro: 'Usuario não encontrado.' });

        if (executorPerfil === 'coordenador' && (alvo.perfil === 'admin' || alvo.perfil === 'coordenador')) {
            return res.status(403).json({ erro: 'Coordenadores não possuem permissão para moderar administradores ou outros coordenadores.' });
        }

        const { data, error } = await supabase
            .from('usuarios')
            .update({ is_bloqueado })
            .eq('id', id)
            .select();

        if (error) throw error;

        const acao = is_bloqueado ? 'bloqueado' : 'desbloqueado';
        res.json({ mensagem: `Usuario ${acao} com sucesso!`, usuario: data[0] });
    } catch (error) {
        console.error('Erro ao moderar usuario:', error.message);
        res.status(500).json({ erro: 'Erro ao alterar o estado do usuario.' });
    }
};

// 3. Criar Novo Colaborador (Admin cria qualquer um; Coordenador cria apenas Professor ou Candidato)
exports.criarColaborador = async (req, res) => {
    const { nome, email, telefone, senha, perfil } = req.body;
    const executorPerfil = req.usuario.perfil;

    if (!nome || !email || !telefone || !senha || !perfil) {
        return res.status(400).json({ erro: 'Todos os campos são obrigatórios.' });
    }

    if (!['admin', 'coordenador', 'profissional', 'candidato'].includes(perfil)) {
        return res.status(400).json({ erro: 'Perfil de colaborador inválido.' });
    }

    // Regra restritiva para perfil Coordenador
    if (executorPerfil === 'coordenador' && (perfil === 'admin' || perfil === 'coordenador')) {
        return res.status(403).json({ erro: 'Coordenadores só podem cadastrar Professores ou Candidatos.' });
    }

    try {
        // Verificar se e-mail já existe
        const { data: existente } = await supabase
            .from('usuarios')
            .select('id')
            .eq('email', email)
            .maybeSingle();

        if (existente) {
            return res.status(400).json({ erro: 'Este e-mail já está cadastrado.' });
        }

        const salt = await bcrypt.genSalt(10);
        const senhaHash = await bcrypt.hash(senha, salt);

        const { data: novoColab, error } = await supabase
            .from('usuarios')
            .insert([{
                nome,
                email,
                telefone,
                senha: senhaHash,
                perfil,
                consentimento_termos: true, // Colaboradores institucionais
                consentimento_imagem: false
            }])
            .select();

        if (error) throw error;

        res.status(201).json({
            mensagem: `Colaborador (${perfil}) criado com sucesso!`,
            colaborador: { id: novoColab[0].id, nome: novoColab[0].nome }
        });
    } catch (error) {
        console.error('Erro ao criar colaborador:', error.message);
        res.status(500).json({ erro: 'Erro interno ao criar colaborador.' });
    }
};

// Buscar profissionais (professores) ativos parcarregando no dropdown do formulário de curso
exports.listarProfissionais = async (req, res) => {
    try {
        const { data, error } = await supabase
            .from('usuarios')
            .select('id, nome')
            .eq('perfil', 'profissional')
            .eq('is_bloqueado', false);

        if (error) throw error;
        res.json(data);
    } catch (error) {
        res.status(500).json({ erro: 'Erro ao carregar profissionais.' });
    }
};

exports.excluirUsuario = async (req, res) => {
    const { id } = req.params;
    const executorPerfil = req.usuario.perfil; // Quem está solicitando a exclusão
    const executorId = req.usuario.id;

    if (id === executorId) {
        return res.status(400).json({ erro: 'Você não pode excluir sua própria conta por este painel.' });
    }

    try {
        // 1. Verificar o perfil do usuario alvo
        const { data: alvo, error: erroBusca } = await supabase
            .from('usuarios')
            .select('perfil')
            .eq('id', id)
            .single();

        if (erroBusca || !alvo) {
            return res.status(404).json({ erro: 'Usuario não encontrado.' });
        }

        // 2. Aplicar regras restritivas do RBAC para Coordenador
        if (executorPerfil === 'coordenador' && (alvo.perfil === 'admin' || alvo.perfil === 'coordenador')) {
            return res.status(403).json({ erro: 'Coordenadores não possuem permissão para excluir Administradores ou outros Coordenadores.' });
        }

        // 3. Executar deleção (O banco em cascata limpa agendamentos associados)
        const { error: erroExclusao } = await supabase
            .from('usuarios')
            .delete()
            .eq('id', id);

        if (erroExclusao) throw erroExclusao;

        res.json({ mensagem: 'Usuario excluído do sistema com sucesso!' });
    } catch (error) {
        console.error('Erro ao excluir usuario:', error.message);
        res.status(500).json({ erro: 'Erro interno ao realizar exclusão.' });
    }
};

// 5. Alterar Perfil do Usuario (Promover/alterar cargo)
exports.alterarPerfil = async (req, res) => {
    const { id } = req.params;
    const { perfil } = req.body;
    const executorPerfil = req.usuario.perfil;
    const executorId = req.usuario.id;

    if (id === executorId) {
        return res.status(400).json({ erro: 'Não pode alterar o seu próprio nível de acesso.' });
    }

    if (!['admin', 'coordenador', 'profissional', 'candidato'].includes(perfil)) {
        return res.status(400).json({ erro: 'Perfil inválido.' });
    }

    try {
        const { data: alvo, error: erroBusca } = await supabase
            .from('usuarios')
            .select('perfil')
            .eq('id', id)
            .single();

        if (erroBusca || !alvo) return res.status(404).json({ erro: 'Usuario não encontrado.' });

        if (executorPerfil === 'coordenador') {
            if (alvo.perfil === 'admin' || perfil === 'admin' || alvo.perfil === 'coordenador' || perfil === 'coordenador') {
                return res.status(403).json({ erro: 'Coordenadores não podem gerenciar ou conceder cargos de Administrador ou Coordenador.' });
            }
        }

        const { error } = await supabase
            .from('usuarios')
            .update({ perfil })
            .eq('id', id);

        if (error) throw error;
        res.json({ mensagem: `Cargo do usuario atualizado para '${perfil}' com sucesso!` });
    } catch (error) {
        console.error('Erro ao alterar cargo:', error.message);
        res.status(500).json({ erro: 'Erro ao alterar o perfil do usuario.' });
    }
};

exports.listarPautasGlobais = async (req, res) => {
    try {
        const { data, error } = await supabase
            .from('cursos')
            .select(`
                id, nome, usuarios!cursos_profissional_id_fkey(nome),
                disponibilidades (
                    id, data_hora, vagas_totais, vagas_ocupadas,
                    agendamentos ( id, status, usuarios ( nome, telefone ) )
                )
            `)
            .eq('status', 'ativo')
            .order('nome');

        if (error) throw error;
        res.json(data);
    } catch (error) {
        res.status(500).json({ erro: 'Erro ao carregar as pautas globais.' });
    }
};


