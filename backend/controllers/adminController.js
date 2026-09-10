// backend/controllers/adminController.js
const supabase = require('../config/database');
const bcrypt = require('bcrypt');
const fs = require('fs');
const path = require('path');
const deptFilePath = path.join(__dirname, '../config/professores_departamentos.json');

function getProfessoresDepartamentos() {
    try {
        if (!fs.existsSync(deptFilePath)) {
            fs.writeFileSync(deptFilePath, JSON.stringify({}, null, 2), 'utf8');
            return {};
        }
        return JSON.parse(fs.readFileSync(deptFilePath, 'utf8'));
    } catch (e) {
        return {};
    }
}

function setProfessorDepartamento(usuarioId, departamento) {
    try {
        const mapa = getProfessoresDepartamentos();
        mapa[usuarioId] = departamento || 'DR/BA';
        fs.writeFileSync(deptFilePath, JSON.stringify(mapa, null, 2), 'utf8');
    } catch (e) {
        console.error('Erro ao salvar departamento de professor:', e.message);
    }
}


// 1. Listar usuarios com metricas (consome a View agregando consentimentos LGPD e Imagem)
exports.listarUsuarios = async (req, res) => {
    try {
        const [{ data: usuarios, error: errView }, { data: consentimentos, error: errCons }] = await Promise.all([
            supabase.from('view_usuarios_estatisticas').select('*').order('nome', { ascending: true }),
            supabase.from('usuarios').select('id, consentimento_termos, consentimento_imagem')
        ]);

        if (errView) throw errView;

        const consentMap = new Map();
        if (consentimentos) {
            consentimentos.forEach(c => consentMap.set(c.id, c));
        }

        const deptoMap = getProfessoresDepartamentos();
        let usuariosCompletos = (usuarios || []).map(u => {
            const consent = consentMap.get(u.id);
            const depto = deptoMap[u.id] || (['profissional', 'coordenador', 'admin'].includes(u.perfil) ? 'DR/BA' : null);
            return {
                ...u,
                consentimento_termos: consent ? Boolean(consent.consentimento_termos) : Boolean(u.consentimento_termos),
                consentimento_imagem: consent ? Boolean(consent.consentimento_imagem) : Boolean(u.consentimento_imagem),
                departamento: depto
            };
        });

        if (req.query.departamento && req.query.departamento !== 'TODOS') {
            usuariosCompletos = usuariosCompletos.filter(u => !u.departamento || u.departamento === req.query.departamento);
        }

        res.json(usuariosCompletos);
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
    const { nome, email, telefone, senha, perfil, departamento } = req.body;
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

        const deptoFinal = departamento || 'DR/BA';
        setProfessorDepartamento(novoColab[0].id, deptoFinal);

        res.status(201).json({
            mensagem: `Colaborador (${perfil}) criado com sucesso para ${deptoFinal}!`,
            colaborador: { id: novoColab[0].id, nome: novoColab[0].nome, departamento: deptoFinal }
        });
    } catch (error) {
        console.error('Erro ao criar colaborador:', error.message);
        res.status(500).json({ erro: 'Erro interno ao criar colaborador.' });
    }
};

// Buscar profissionais (professores) ativos com suporte a filtro por departamento
exports.listarProfissionais = async (req, res) => {
    try {
        const { departamento } = req.query;
        const { data, error } = await supabase
            .from('usuarios')
            .select('id, nome')
            .eq('perfil', 'profissional')
            .eq('is_bloqueado', false);

        if (error) throw error;

        const deptoMap = getProfessoresDepartamentos();
        const listaComDepto = (data || []).map(p => ({
            ...p,
            departamento: deptoMap[p.id] || 'DR/BA'
        }));

        if (departamento && departamento !== 'TODOS') {
            const filtrados = listaComDepto.filter(p => p.departamento === departamento);
            return res.json(filtrados);
        }

        res.json(listaComDepto);
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

        // 3. Desvincular cursos se o usuário for profissional docente
        await supabase
            .from('cursos')
            .update({ profissional_id: null })
            .eq('profissional_id', id);

        // 4. Limpar agendamentos associados
        await supabase
            .from('agendamentos')
            .delete()
            .eq('usuario_id', id);

        // 5. Executar deleção definitiva do usuário
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

// 6. Alterar o Próprio Departamento (Admin ou Coordenador)
exports.alterarMeuDepartamento = async (req, res) => {
    const { departamento } = req.body;
    const executorId = req.usuario.id;

    if (!departamento) {
        return res.status(400).json({ erro: 'O departamento é obrigatório.' });
    }

    try {
        setProfessorDepartamento(executorId, departamento);
        res.json({
            mensagem: `Seu departamento foi atualizado para ${departamento} com sucesso!`,
            departamento
        });
    } catch (error) {
        console.error('Erro ao alterar meu departamento:', error.message);
        res.status(500).json({ erro: 'Erro interno ao atualizar seu departamento.' });
    }
};

// 7. Alterar Departamento de Usuário (com regra estrita: admin/coord só alteram o seu próprio)
exports.alterarDepartamento = async (req, res) => {
    const { id } = req.params;
    const { departamento } = req.body;
    const executorId = req.usuario.id;

    if (!departamento) {
        return res.status(400).json({ erro: 'O departamento é obrigatório.' });
    }

    try {
        const { data: alvo, error: erroBusca } = await supabase
            .from('usuarios')
            .select('id, perfil, nome')
            .eq('id', id)
            .single();

        if (erroBusca || !alvo) {
            return res.status(404).json({ erro: 'Usuário não encontrado.' });
        }

        // Regra de Segurança:
        // Administrador e Coordenador só podem editar o seu PRÓPRIO departamento,
        // nunca o de outros administradores ou coordenadores!
        if (['admin', 'coordenador'].includes(alvo.perfil) && id !== executorId) {
            return res.status(403).json({
                erro: 'Não é permitido alterar o departamento de outros administradores ou coordenadores. Você só pode alterar o seu próprio departamento.'
            });
        }

        setProfessorDepartamento(id, departamento);

        res.json({
            mensagem: `Departamento atualizado para ${departamento} com sucesso!`,
            departamento
        });
    } catch (error) {
        console.error('Erro ao alterar departamento:', error.message);
        res.status(500).json({ erro: 'Erro interno ao atualizar departamento.' });
    }
};



