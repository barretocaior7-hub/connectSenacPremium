// backend/controllers/cursoController.js
const supabase = require('../config/database');
const fs = require('fs');
const path = require('path');
const deptFilePath = path.join(__dirname, '../config/professores_departamentos.json');

function getProfessoresDepartamentos() {
    try {
        if (!fs.existsSync(deptFilePath)) return {};
        return JSON.parse(fs.readFileSync(deptFilePath, 'utf8'));
    } catch (_) {
        return {};
    }
}

function resolverDepartamentoCurso(curso, deptoMap) {
    if (curso.departamento) return curso.departamento;
    if (curso.profissional_id && deptoMap[curso.profissional_id]) {
        return deptoMap[curso.profissional_id];
    }
    if (curso.localizacao) {
        const match = curso.localizacao.match(/\b(AC|AL|AP|AM|BA|CE|DF|ES|GO|MA|MT|MS|MG|PA|PB|PR|PE|PI|RJ|RN|RS|RO|RR|SC|SP|SE|TO)\b/i);
        if (match) {
            return `DR/${match[1].toUpperCase()}`;
        }
    }
    return 'DR/BA';
}

// 1. [VITRINE] Listar todos os cursos ativos (Para o candidato, filtrável por região/departamento)
exports.listarAtivos = async (req, res) => {
    try {
        const { data: cursos, error } = await supabase
            .from('cursos')
            .select(`
                id, nome, descricao, motivo_modelo, restricoes, foto_url, localizacao, status, profissional_id,
                usuarios ( nome ),
                disponibilidades ( id, data_hora, vagas_totais, vagas_ocupadas )
            `)
            .eq('status', 'ativo')
            .order('created_at', { ascending: false });

        if (error) throw error;

        const deptoMap = getProfessoresDepartamentos();

        let cursosProcessados = (cursos || []).map(c => {
            const depto = resolverDepartamentoCurso(c, deptoMap);
            if (Array.isArray(c.disponibilidades)) {
                c.disponibilidades.sort((a, b) => new Date(a.data_hora) - new Date(b.data_hora));
            }
            return {
                ...c,
                departamento: depto
            };
        });

        // Filtragem por departamento regional
        const deptoFiltro = req.query.departamento || (req.query.uf ? `DR/${req.query.uf.toUpperCase()}` : null);
        if (deptoFiltro && deptoFiltro !== 'TODOS') {
            cursosProcessados = cursosProcessados.filter(c => c.departamento === deptoFiltro);
        }

        res.json(cursosProcessados);
    } catch (error) {
        res.status(500).json({ erro: 'Erro ao buscar o catálogo de cursos.' });
    }
};

// 2. [ADMIN] Listar TODOS os cursos (Ativos e Arquivados para Gestão)
exports.listarTodosAdmin = async (req, res) => {
    try {
        const { data: cursos, error } = await supabase
            .from('cursos')
            .select(`id, nome, descricao, motivo_modelo, restricoes, foto_url, localizacao, status, profissional_id, usuarios ( nome )`)
            .order('created_at', { ascending: false });

        if (error) throw error;

        const deptoMap = getProfessoresDepartamentos();
        let cursosComDepto = (cursos || []).map(c => ({
            ...c,
            departamento: resolverDepartamentoCurso(c, deptoMap)
        }));

        if (req.query.departamento && req.query.departamento !== 'TODOS') {
            cursosComDepto = cursosComDepto.filter(c => c.departamento === req.query.departamento);
        }

        res.json(cursosComDepto);
    } catch (error) {
        res.status(500).json({ erro: 'Erro ao listar os cursos para a administracao.' });
    }
};

// 3. [ADMIN] Criar Curso
exports.criar = async (req, res) => {
    const { nome, descricao, motivo_modelo, restricoes, foto_url, localizacao, profissional_id } = req.body;

    if (!nome || !descricao || !profissional_id) {
        return res.status(400).json({ erro: 'Nome, descrição e professor são obrigatórios.' });
    }

    try {
        const { data: novoCurso, error } = await supabase
            .from('cursos')
            .insert([{ nome, descricao, motivo_modelo, restricoes, foto_url, localizacao, profissional_id }])
            .select();

        if (error) throw error;
        res.status(201).json({ mensagem: 'Curso criado com sucesso!', curso: novoCurso[0] });
    } catch (error) {
        res.status(500).json({ erro: 'Erro interno ao criar o curso.' });
    }
};

// 4. [ADMIN] Atualizar Curso
exports.atualizar = async (req, res) => {
    const { id } = req.params;
    const { nome, descricao, motivo_modelo, restricoes, foto_url, localizacao, profissional_id } = req.body;

    try {
        const { data, error } = await supabase
            .from('cursos')
            .update({ nome, descricao, motivo_modelo, restricoes, foto_url, localizacao, profissional_id })
            .eq('id', id)
            .select();

        if (error) throw error;
        res.json({ mensagem: 'Curso atualizado com sucesso!', curso: data[0] });
    } catch (error) {
        res.status(500).json({ erro: 'Erro ao atualizar o curso.' });
    }
};

// 5. [ADMIN] Arquivar Curso (Soft Delete)
exports.arquivar = async (req, res) => {
    const { id } = req.params;

    try {
        const { error } = await supabase
            .from('cursos')
            .update({ status: 'arquivado' })
            .eq('id', id);

        if (error) throw error;
        res.json({ mensagem: 'Curso arquivado e removido da vitrine!' });
    } catch (error) {
        res.status(500).json({ erro: 'Erro ao arquivar o curso.' });
    }
};

exports.buscarAtivoPorId = async (req, res) => {
    try {
        const { data: curso, error } = await supabase
            .from('cursos')
            .select(`id, nome, descricao, motivo_modelo, restricoes, foto_url, localizacao, status, usuarios ( nome )`)
            .eq('id', req.params.id)
            .eq('status', 'ativo')
            .maybeSingle();

        if (error) throw error;
        if (!curso) return res.status(404).json({ erro: 'Curso não encontrado.' });

        const deptoMap = getProfessoresDepartamentos();
        curso.departamento = resolverDepartamentoCurso(curso, deptoMap);

        res.json(curso);
    } catch (error) {
        res.status(500).json({ erro: 'Erro ao buscar o curso.' });
    }
};

// 6. [ADMIN/COORDENADOR] Desarquivar Curso
exports.desarquivar = async (req, res) => {
    const { id } = req.params;

    try {
        const { error } = await supabase
            .from('cursos')
            .update({ status: 'ativo' })
            .eq('id', id);

        if (error) throw error;
        res.json({ mensagem: 'Curso desarquivado e reativado na vitrine com sucesso!' });
    } catch (error) {
        res.status(500).json({ erro: 'Erro ao reativar o curso.' });
    }
};

// 7. [ADMIN/COORDENADOR] Excluir Curso Definitivamente
exports.excluir = async (req, res) => {
    const { id } = req.params;

    try {
        // 1. Buscar disponibilidades vinculadas ao curso para cascata manual segura
        const { data: disponibilidades, error: erroDisp } = await supabase
            .from('disponibilidades')
            .select('id')
            .eq('curso_id', id);

        if (!erroDisp && disponibilidades && disponibilidades.length > 0) {
            const dispIds = disponibilidades.map(d => d.id);

            // Remover agendamentos dessas disponibilidades
            await supabase
                .from('agendamentos')
                .delete()
                .in('disponibilidade_id', dispIds);

            // Remover as disponibilidades
            await supabase
                .from('disponibilidades')
                .delete()
                .eq('curso_id', id);
        }

        // 2. Remover feedbacks do curso se houver
        try {
            await supabase
                .from('feedbacks')
                .delete()
                .eq('curso_id', id);
        } catch (e) {
            // Ignora se não houver coluna curso_id na tabela
        }

        // 3. Excluir o registro do curso
        const { error: erroCurso } = await supabase
            .from('cursos')
            .delete()
            .eq('id', id);

        if (erroCurso) throw erroCurso;

        res.json({ mensagem: 'Curso excluído definitivamente com sucesso!' });
    } catch (error) {
        console.error('Erro ao excluir curso:', error.message);
        res.status(500).json({ erro: 'Erro interno ao excluir o curso.' });
    }
};
