// backend/controllers/disponibilidadeController.js
const supabase = require('../config/database');

// Função RESTRITA (Admin/Coordenador): Criar uma nova data/hora para um curso
exports.criar = async (req, res) => {
    const { curso_id, data_hora, vagas_totais } = req.body;

    if (!curso_id || !data_hora || vagas_totais === undefined || vagas_totais === null) {
        return res.status(400).json({ erro: 'Curso, data/hora e número de vagas são obrigatórios.' });
    }

    const vagas = parseInt(vagas_totais, 10);
    if (isNaN(vagas) || vagas <= 0 || vagas > 200) {
        return res.status(400).json({ erro: 'O número de vagas deve ser um número inteiro positivo (mínimo 1).' });
    }

    const dataObj = new Date(data_hora);
    if (isNaN(dataObj.getTime())) {
        return res.status(400).json({ erro: 'A data e hora informada é inválida.' });
    }

    const inicioDeHoje = new Date();
    inicioDeHoje.setHours(0, 0, 0, 0);

    if (dataObj < inicioDeHoje) {
        return res.status(400).json({ erro: 'A data e hora não pode ser de dias passados.' });
    }

    try {
        const { data: novaDisponibilidade, error } = await supabase
            .from('disponibilidades')
            .insert([{
                curso_id,
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

    try {
        // Pega o início do dia de hoje (00:00:00) para listar vagas de hoje e dias futuros
        const inicioDeHoje = new Date();
        inicioDeHoje.setHours(0, 0, 0, 0);

        const { data: disponibilidades, error } = await supabase
            .from('disponibilidades')
            .select('id, data_hora, vagas_totais, vagas_ocupadas')
            .eq('curso_id', curso_id)
            // Filtra para mostrar vagas de hoje em diante
            .gte('data_hora', inicioDeHoje.toISOString())
            .order('data_hora', { ascending: true });

        if (error) throw error;

        // Opcional: Filtrar no JavaScript para retornar apenas os que têm vagas livres
        // (Isso também pode ser feito direto na query, mas aqui fica mais didático)
        const horariosLivres = disponibilidades.filter(d => d.vagas_ocupadas < d.vagas_totais);

        res.json(horariosLivres);
    } catch (error) {
        console.error('Erro ao buscar disponibilidades:', error.message);
        res.status(500).json({ erro: 'Erro ao carregar os horários disponíveis.' });
    }
};