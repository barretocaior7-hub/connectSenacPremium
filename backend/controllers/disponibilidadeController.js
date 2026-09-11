// backend/controllers/disponibilidadeController.js
const supabase = require('../config/database');
const { getInfoFusoDepartamento, isHorarioFuturo, parseDataNoFuso } = require('../utils/dateUtils');

// Função RESTRITA (Admin/Coordenador): Criar uma nova data/hora para um curso
exports.criar = async (req, res) => {
    const { curso_id, data_hora, vagas_totais } = req.body;

    if (!curso_id || !data_hora || vagas_totais === undefined || vagas_totais === null) {
        return res.status(400).json({ erro: 'Curso, data/hora e número de vagas são obrigatórios.' });
    }

    const cid = String(curso_id).trim();
    if (!cid || cid === 'undefined' || cid === 'null') {
        return res.status(400).json({ erro: 'Identificador do curso inválido.' });
    }

    const vagas = parseInt(vagas_totais, 10);
    if (isNaN(vagas) || vagas <= 0 || vagas > 200) {
        return res.status(400).json({ erro: 'O número de vagas deve ser um número inteiro positivo (mínimo 1).' });
    }

    let depto = 'DR/BA';
    try {
        const { data: cursoData } = await supabase
            .from('cursos')
            .select('localizacao')
            .eq('id', cid)
            .maybeSingle();

        if (cursoData && cursoData.localizacao) {
            const match = cursoData.localizacao.match(/\b(AC|AL|AP|AM|BA|CE|DF|ES|GO|MA|MT|MS|MG|PA|PB|PR|PE|PI|RJ|RN|RS|RO|RR|SC|SP|SE|TO)\b/i);
            if (match) depto = `DR/${match[1].toUpperCase()}`;
        }
    } catch (_) {}

    const dataObj = parseDataNoFuso(data_hora, depto);
    if (!dataObj || isNaN(dataObj.getTime())) {
        return res.status(400).json({ erro: 'A data e hora informada é inválida.' });
    }

    if (!isHorarioFuturo(dataObj, depto, -15)) {
        return res.status(400).json({ erro: 'A data e horário da aula deve estar no futuro em relação ao momento atual.' });
    }

    try {
        const { data: novaDisponibilidade, error } = await supabase
            .from('disponibilidades')
            .insert([{
                curso_id: cid,
                data_hora: dataObj.toISOString(),
                vagas_totais: vagas
            }])
            .select();

        if (error) {
            // Tratamento de erro específico para a regra UNIQUE que criamos no SQL
            if (error.code === '23505') {
                return res.status(400).json({ erro: 'Já existe uma grade criada exatamente para este horário neste curso.' });
            }
            throw error;
        }

        res.status(201).json({
            mensagem: 'Horário e vagas disponibilizados com sucesso!',
            disponibilidade: novaDisponibilidade[0]
        });
    } catch (error) {
        console.error('Erro ao criar disponibilidade:', error.message);
        res.status(500).json({ erro: 'Erro interno ao criar a disponibilidade.' });
    }
};

// Função PÚBLICA (Para logados): Listar horários futuros e com vagas de um curso específico
exports.listarPorCurso = async (req, res) => {
    const { curso_id } = req.params;
    const cid = String(curso_id || '').trim();

    if (!cid || cid === 'undefined' || cid === 'null') {
        return res.status(400).json({ erro: 'Identificador do curso inválido.' });
    }

    try {
        // Buscar dados de localização/departamento do curso para timezone correto
        let depto = 'DR/BA';
        try {
            const { data: cursoData } = await supabase
                .from('cursos')
                .select('id, localizacao')
                .eq('id', cid)
                .maybeSingle();

            if (cursoData && cursoData.localizacao) {
                const match = cursoData.localizacao.match(/\b(AC|AL|AP|AM|BA|CE|DF|ES|GO|MA|MT|MS|MG|PA|PB|PR|PE|PI|RJ|RN|RS|RO|RR|SC|SP|SE|TO)\b/i);
                if (match) depto = `DR/${match[1].toUpperCase()}`;
            }
        } catch (_) {}

        const infoFuso = getInfoFusoDepartamento(depto);

        const { data: disponibilidades, error } = await supabase
            .from('disponibilidades')
            .select('id, data_hora, vagas_totais, vagas_ocupadas')
            .eq('curso_id', cid)
            .order('data_hora', { ascending: true });

        if (error) throw error;

        // Filtrar apenas horários estritamente futuros e com vagas livres
        const horariosLivres = (disponibilidades || [])
            .filter(d => (d.vagas_totais - d.vagas_ocupadas) > 0 && isHorarioFuturo(d.data_hora, depto))
            .map(d => ({
                ...d,
                timezone: infoFuso.timeZone,
                fusoDesc: infoFuso.fusoDesc,
                siglaFuso: infoFuso.sigla
            }));

        res.json(horariosLivres);
    } catch (error) {
        console.error('Erro ao buscar disponibilidades:', error.message);
        res.status(500).json({ erro: 'Erro ao carregar os horários disponíveis.' });
    }
};