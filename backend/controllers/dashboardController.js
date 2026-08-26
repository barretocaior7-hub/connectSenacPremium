// backend/controllers/dashboardController.js
const supabase = require('../config/database');

exports.obterMetricas = async (req, res) => {
    try {
        // Consultas otimizadas com { count: 'exact', head: true }
        // Não trafega linhas de dados pela rede, apenas a contagem exata no banco de dados
        const [
            usuariosResult,
            cursosResult,
            totalAgendamentosResult,
            agendadosResult,
            concluidosResult,
            canceladosResult
        ] = await Promise.all([
            supabase.from('usuarios').select('*', { count: 'exact', head: true }),
            supabase.from('cursos').select('*', { count: 'exact', head: true }).eq('status', 'ativo'),
            supabase.from('agendamentos').select('*', { count: 'exact', head: true }),
            supabase.from('agendamentos').select('*', { count: 'exact', head: true }).eq('status', 'agendado'),
            supabase.from('agendamentos').select('*', { count: 'exact', head: true }).eq('status', 'concluido'),
            supabase.from('agendamentos').select('*', { count: 'exact', head: true }).eq('status', 'cancelado')
        ]);

        if (usuariosResult.error) throw usuariosResult.error;
        if (cursosResult.error) throw cursosResult.error;
        if (totalAgendamentosResult.error) throw totalAgendamentosResult.error;
        if (agendadosResult.error) throw agendadosResult.error;
        if (concluidosResult.error) throw concluidosResult.error;
        if (canceladosResult.error) throw canceladosResult.error;

        const total = totalAgendamentosResult.count || 0;
        const agendados = agendadosResult.count || 0;
        const concluidos = concluidosResult.count || 0;
        const cancelados = canceladosResult.count || 0;

        const metricasAgendamentos = {
            total,
            agendados,
            concluidos,
            cancelados
        };

        // Calculando a taxa de absenteísmo/cancelamento
        const taxaCancelamento = total > 0
            ? ((cancelados / total) * 100).toFixed(1)
            : 0;

        res.json({
            totalUsuarios: usuariosResult.count || 0,
            totalCursosAtivos: cursosResult.count || 0,
            agendamentos: metricasAgendamentos,
            taxaCancelamento: `${taxaCancelamento}%`
        });

    } catch (error) {
        console.error('Erro ao buscar métricas do dashboard:', error.message);
        res.status(500).json({ erro: 'Erro interno ao processar as métricas.' });
    }
};