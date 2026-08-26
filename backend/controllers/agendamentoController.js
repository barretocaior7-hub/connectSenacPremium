// backend/controllers/agendamentoController.js
const supabase = require('../config/database');

// ============================================================================
// LÓGICA DO CANDIDATO
// ============================================================================

// [Funcionalidade] Candidato: Criar Agendamento (Inscrever-se na vaga)
exports.criar = async (req, res) => {
    const { disponibilidade_id } = req.body;
    const usuario_id = req.usuario.id; // Pegamos o ID de quem está logado pelo token!

    if (!disponibilidade_id) {
        return res.status(400).json({ erro: 'O ID da disponibilidade é obrigatório.' });
    }

    try {
        // 1. Verificar se a vaga existe, se a data é futura e se tem espaço (Regra de Overbooking)
        const { data: disponibilidade, error: erroDisp } = await supabase
            .from('disponibilidades')
            .select('id, data_hora, vagas_totais, vagas_ocupadas')
            .eq('id', disponibilidade_id)
            .single();

        if (erroDisp || !disponibilidade) {
            return res.status(404).json({ erro: 'Horário não encontrado.' });
        }

        // Validação contra agendamento retroativo
        if (new Date(disponibilidade.data_hora) <= new Date()) {
            return res.status(400).json({ erro: 'Este horário já ocorreu ou encerrou as inscrições.' });
        }

        if (disponibilidade.vagas_ocupadas >= disponibilidade.vagas_totais) {
            return res.status(400).json({ erro: 'Infelizmente, não há mais vagas para este horário.' });
        }

        // Bloqueia choque entre cursos apenas enquanto o agendamento estiver ativo.
        // Assim que o utilizador cancela, pode escolher outro curso no mesmo horário.
        const { data: conflitoHorario, error: erroConflito } = await supabase
            .from('agendamentos')
            .select('id, disponibilidade_id, disponibilidades!inner(data_hora)')
            .eq('usuario_id', usuario_id)
            .eq('status', 'agendado')
            .eq('disponibilidades.data_hora', disponibilidade.data_hora)
            .limit(1)
            .maybeSingle();

        if (erroConflito) throw erroConflito;
        if (conflitoHorario) {
            return res.status(409).json({
                erro: conflitoHorario.disponibilidade_id === disponibilidade_id
                    ? 'Você já possui uma inscrição ativa para esta vaga.'
                    : 'Você já possui outro curso agendado neste horário. Cancele-o antes de escolher este curso.'
            });
        }

        // Procura um registo anterior para permitir reagendar uma vaga cancelada,
        // inclusive quando o banco possui UNIQUE(usuario_id, disponibilidade_id).
        const { data: agendamentoAnterior, error: erroAnterior } = await supabase
            .from('agendamentos')
            .select('id, status')
            .eq('usuario_id', usuario_id)
            .eq('disponibilidade_id', disponibilidade_id)
            .maybeSingle();

        if (erroAnterior) throw erroAnterior;

        let novoAgendamento;
        let agendamentoReativado = false;

        if (agendamentoAnterior) {
            if (agendamentoAnterior.status !== 'cancelado') {
                return res.status(409).json({ erro: 'Esta inscrição não pode ser reativada.' });
            }

            const { data, error } = await supabase
                .from('agendamentos')
                .update({ status: 'agendado' })
                .eq('id', agendamentoAnterior.id)
                .select()
                .single();

            if (error) throw error;
            novoAgendamento = data;
            agendamentoReativado = true;
        } else {
            const { data, error } = await supabase
                .from('agendamentos')
                .insert([{ usuario_id, disponibilidade_id, status: 'agendado' }])
                .select()
                .single();

            if (error?.code === '23505') {
                return res.status(409).json({ erro: 'Esta inscrição já existe. Atualize a página e tente novamente.' });
            }
            if (error) throw error;
            novoAgendamento = data;
        }

        // 3. Atualizar o contador de vagas ocupadas com proteção
        const { error: erroUpdateDisp } = await supabase
            .from('disponibilidades')
            .update({ vagas_ocupadas: Math.min(disponibilidade.vagas_totais, disponibilidade.vagas_ocupadas + 1) })
            .eq('id', disponibilidade_id);

        if (erroUpdateDisp) {
            if (agendamentoReativado) {
                await supabase.from('agendamentos').update({ status: 'cancelado' }).eq('id', novoAgendamento.id);
            } else {
                await supabase.from('agendamentos').delete().eq('id', novoAgendamento.id);
            }
            throw erroUpdateDisp;
        }

        res.status(201).json({
            mensagem: 'Agendamento realizado com sucesso!',
            agendamento: novoAgendamento
        });

    } catch (error) {
        console.error('Erro ao agendar:', error.message);
        res.status(500).json({ erro: 'Erro interno ao realizar agendamento.' });
    }
};

// [Funcionalidade] Candidato: Listar os seus próprios agendamentos
exports.listarMeus = async (req, res) => {
    const usuario_id = req.usuario.id;

    try {
        const { data: meusAgendamentos, error } = await supabase
            .from('agendamentos')
            .select(`
                id, status, created_at,
                disponibilidades (
                    data_hora,
                    cursos ( nome, foto_url )
                )
            `)
            .eq('usuario_id', usuario_id)
            .order('created_at', { ascending: false });

        if (error) throw error;
        res.json(meusAgendamentos);
    } catch (error) {
        console.error('Erro ao buscar agendamentos:', error.message);
        res.status(500).json({ erro: 'Erro ao carregar os seus agendamentos.' });
    }
};

// [Funcionalidade] Candidato: Cancelar Agendamento (Com Regra das 2 Horas)
exports.cancelar = async (req, res) => {
    const { id } = req.params;
    const usuario_id = req.usuario.id;

    try {
        // Busca o agendamento para verificar a data e o dono
        const { data: agendamento, error: erroBusca } = await supabase
            .from('agendamentos')
            .select('id, status, disponibilidades(data_hora, vagas_ocupadas, id)')
            .eq('id', id)
            .eq('usuario_id', usuario_id) // Garante que o usuário só cancela o DELE
            .single();

        if (erroBusca || !agendamento) {
            return res.status(404).json({ erro: 'Agendamento não encontrado ou não pertence a você.' });
        }

        if (agendamento.status !== 'agendado') {
            return res.status(400).json({ erro: 'Apenas agendamentos ativos podem ser cancelados.' });
        }

        // Validação da Regra das 2 Horas
        const dataHoraCurso = new Date(agendamento.disponibilidades.data_hora);
        const agora = new Date();
        const diferencaEmHoras = (dataHoraCurso - agora) / (1000 * 60 * 60);

        if (diferencaEmHoras < 2) {
            return res.status(403).json({
                erro: 'Não é possível cancelar com menos de 2 horas de antecedência. Em caso de emergência, contacte a coordenação.'
            });
        }

        const { error: erroCancelamento } = await supabase
            .from('agendamentos')
            .update({ status: 'cancelado' })
            .eq('id', id)
            .eq('status', 'agendado');

        if (erroCancelamento) throw erroCancelamento;

        // Liberta a vaga na tabela de disponibilidades (se > 0)
        const disp = agendamento.disponibilidades;
        if (disp && disp.vagas_ocupadas > 0) {
            const { error: erroLibertarVaga } = await supabase
                .from('disponibilidades')
                .update({ vagas_ocupadas: disp.vagas_ocupadas - 1 })
                .eq('id', disp.id);

            if (erroLibertarVaga) {
                await supabase.from('agendamentos').update({ status: 'agendado' }).eq('id', id);
                throw erroLibertarVaga;
            }
        }

        res.json({ mensagem: 'Agendamento cancelado com sucesso. A sua vaga foi libertada.' });
    } catch (error) {
        console.error('Erro ao cancelar:', error.message);
        res.status(500).json({ erro: 'Erro interno ao cancelar o agendamento.' });
    }
};

// ============================================================================
// LÓGICA ADMINISTRATIVA (OVERRIDE)
// ============================================================================

// [Funcionalidade] Admin: Cancelar QUALQUER agendamento sem restrição de tempo
exports.adminCancelar = async (req, res) => {
    const { id } = req.params;

    try {
        const { data: agendamento } = await supabase
            .from('agendamentos')
            .select('id, status, disponibilidades(vagas_ocupadas, id)')
            .eq('id', id)
            .single();

        if (!agendamento) return res.status(404).json({ erro: 'Agendamento não encontrado.' });

        if (agendamento.status !== 'agendado') {
            return res.status(400).json({ erro: 'Apenas agendamentos ativos podem ser cancelados.' });
        }

        // O Admin cancela sem verificar dono e sem verificar a regra das 2 horas!
        await supabase.from('agendamentos').update({ status: 'cancelado' }).eq('id', id);

        const disp = agendamento.disponibilidades;
        if (disp && disp.vagas_ocupadas > 0) {
            await supabase
                .from('disponibilidades')
                .update({ vagas_ocupadas: disp.vagas_ocupadas - 1 })
                .eq('id', disp.id);
        }

        res.json({ mensagem: '[ADMIN] Agendamento cancelado forçadamente.' });
    } catch (error) {
        console.error('Erro no cancelamento admin:', error.message);
        res.status(500).json({ erro: 'Erro interno na operação administrativa.' });
    }
};
