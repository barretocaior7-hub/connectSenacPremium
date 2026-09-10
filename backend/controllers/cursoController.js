// backend/controllers/cursoController.js
const supabase = require('../config/database');
const fs = require('fs');
const path = require('path');
const deptProfFilePath = path.join(__dirname, '../config/professores_departamentos.json');
const deptCursoFilePath = path.join(__dirname, '../config/cursos_departamentos.json');

function getProfessoresDepartamentos() {
    try {
        if (!fs.existsSync(deptProfFilePath)) return {};
        return JSON.parse(fs.readFileSync(deptProfFilePath, 'utf8'));
    } catch (_) {
        return {};
    }
}

function getCursosDepartamentos() {
    try {
        if (!fs.existsSync(deptCursoFilePath)) return {};
        return JSON.parse(fs.readFileSync(deptCursoFilePath, 'utf8'));
    } catch (_) {
        return {};
    }
}

function setCursoDepartamento(cursoId, departamento) {
    if (!cursoId || !departamento) return;
    try {
        const mapa = getCursosDepartamentos();
        mapa[cursoId] = departamento;
        fs.writeFileSync(deptCursoFilePath, JSON.stringify(mapa, null, 2), 'utf8');
    } catch (e) {
        console.error('Erro ao persistir departamento do curso:', e.message);
    }
}

function resolverDepartamentoCurso(curso, deptoProfMap, deptoCursosMap) {
    if (curso.id && deptoCursosMap[curso.id]) return deptoCursosMap[curso.id];
    if (curso.departamento) return curso.departamento;
    if (curso.profissional_id && deptoProfMap[curso.profissional_id]) {
        return deptoProfMap[curso.profissional_id];
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

        const deptoProfMap = getProfessoresDepartamentos();
        const deptoCursosMap = getCursosDepartamentos();

        let cursosProcessados = (cursos || []).map(c => {
            const depto = resolverDepartamentoCurso(c, deptoProfMap, deptoCursosMap);
            if (Array.isArray(c.disponibilidades)) {
                c.disponibilidades.sort((a, b) => new Date(a.data_hora) - new Date(b.data_hora));
            }
            return {
                ...c,
                departamento: depto
            };
        });

        // Filtragem estrita por departamento regional
        const deptoFiltro = req.query.departamento || (req.query.uf ? `DR/${req.query.uf.toUpperCase()}` : null);
        if (deptoFiltro && deptoFiltro !== 'TODOS') {
            cursosProcessados = cursosProcessados.filter(c => c.departamento === deptoFiltro);
        }

        res.json(cursosProcessados);
    } catch (error) {
        console.error('Erro ao listar cursos ativos:', error);
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

        const deptoProfMap = getProfessoresDepartamentos();
        const deptoCursosMap = getCursosDepartamentos();

        let cursosComDepto = (cursos || []).map(c => ({
            ...c,
            departamento: resolverDepartamentoCurso(c, deptoProfMap, deptoCursosMap)
        }));

        if (req.query.departamento && req.query.departamento !== 'TODOS') {
            cursosComDepto = cursosComDepto.filter(c => c.departamento === req.query.departamento);
        }

        res.json(cursosComDepto);
    } catch (error) {
        console.error('Erro ao listar cursos para admin:', error);
        res.status(500).json({ erro: 'Erro ao listar os cursos para a administração.' });
    }
};

// 3. [ADMIN/COORDENADOR] Criar Curso com Departamento
exports.criar = async (req, res) => {
    const { nome, descricao, motivo_modelo, restricoes, foto_url, localizacao, profissional_id, departamento } = req.body;

    if (!nome || !descricao || !profissional_id) {
        return res.status(400).json({ erro: 'Nome, descrição e professor são obrigatórios.' });
    }

    const deptoFinal = departamento || 'DR/BA';

    try {
        let novoCurso = null;
        
        // Tentativa de inserção com a coluna departamento
        try {
            const { data, error } = await supabase
                .from('cursos')
                .insert([{ nome, descricao, motivo_modelo, restricoes, foto_url, localizacao, profissional_id, departamento: deptoFinal }])
                .select();
            if (error) throw error;
            novoCurso = data[0];
        } catch (insertColErr) {
            // Fallback caso a tabela no Supabase ainda não tenha a coluna departamento
            const { data, error } = await supabase
                .from('cursos')
                .insert([{ nome, descricao, motivo_modelo, restricoes, foto_url, localizacao, profissional_id }])
                .select();
            if (error) throw error;
            novoCurso = data[0];
        }

        // Persistência garantida no mapa de departamentos por curso
        if (novoCurso && novoCurso.id) {
            setCursoDepartamento(novoCurso.id, deptoFinal);
            novoCurso.departamento = deptoFinal;
        }

        res.status(201).json({ mensagem: 'Curso criado com sucesso!', curso: novoCurso });
    } catch (error) {
        console.error('Erro ao criar curso:', error);
        res.status(500).json({ erro: 'Erro interno ao criar o curso.' });
    }
};

// 4. [ADMIN/COORDENADOR] Atualizar Curso
exports.atualizar = async (req, res) => {
    const { id } = req.params;
    const { nome, descricao, motivo_modelo, restricoes, foto_url, localizacao, profissional_id, departamento } = req.body;

    try {
        let cursoAtualizado = null;

        // Tentativa de update incluindo coluna departamento
        if (departamento) {
            try {
                const { data, error } = await supabase
                    .from('cursos')
                    .update({ nome, descricao, motivo_modelo, restricoes, foto_url, localizacao, profissional_id, departamento })
                    .eq('id', id)
                    .select();
                if (error) throw error;
                cursoAtualizado = data[0];
            } catch (_) {
                // Fallback sem coluna departamento
                const { data, error } = await supabase
                    .from('cursos')
                    .update({ nome, descricao, motivo_modelo, restricoes, foto_url, localizacao, profissional_id })
                    .eq('id', id)
                    .select();
                if (error) throw error;
                cursoAtualizado = data[0];
            }
            setCursoDepartamento(id, departamento);
            if (cursoAtualizado) cursoAtualizado.departamento = departamento;
        } else {
            const { data, error } = await supabase
                .from('cursos')
                .update({ nome, descricao, motivo_modelo, restricoes, foto_url, localizacao, profissional_id })
                .eq('id', id)
                .select();
            if (error) throw error;
            cursoAtualizado = data[0];
        }

        res.json({ mensagem: 'Curso atualizado com sucesso!', curso: cursoAtualizado });
    } catch (error) {
        console.error('Erro ao atualizar curso:', error);
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
