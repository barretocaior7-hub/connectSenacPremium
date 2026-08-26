// backend/cron/notificador.js
const cron = require('node-cron');
const supabase = require('../config/database');

// Conjunto para controle de idempotência (evita reenvio duplicado dentro da janela)
const notificacoesEnviadas = new Set();

// Expressão CRON: '* * * * *' significa "Executar a cada minuto"
cron.schedule('* * * * *', async () => {
    console.log('🤖 [CRON] A executar varredura de notificações de agendamentos...');

    try {
        const agora = new Date();

        // Calcula o limite: daqui a 25 horas para cobrir com folga
        const daquiA25Horas = new Date(agora.getTime() + (25 * 60 * 60 * 1000));
        const limiteInferior = agora.toISOString();
        const limiteSuperior = daquiA25Horas.toISOString();

        // 1. Procurar agendamentos confirmados que acontecem nas próximas 25h
        const { data: agendamentos, error } = await supabase
            .from('agendamentos')
            .select(`
                id,
                status,
                usuarios ( nome, email, telefone ),
                disponibilidades!inner ( data_hora, cursos ( nome ) )
            `)
            .eq('status', 'agendado')
            .gt('disponibilidades.data_hora', limiteInferior)
            .lt('disponibilidades.data_hora', limiteSuperior);

        if (error) throw error;

        if (!agendamentos || agendamentos.length === 0) {
            return;
        }

        // 2. Disparar os avisos com tolerância de janela e controle de envio
        agendamentos.forEach(ag => {
            if (!ag.disponibilidades || !ag.disponibilidades.data_hora) {
                console.log(`⚠️ [CRON AVISO] Agendamento ${ag.id} ignorado: Dados de horário ausentes.`);
                return;
            }

            const dataCurso = new Date(ag.disponibilidades.data_hora);
            const diferencaEmMinutos = Math.floor((dataCurso - agora) / (1000 * 60));

            const curso = ag.disponibilidades.cursos?.nome || 'Curso não identificado';
            const cliente = ag.usuarios?.nome || 'Aluno';
            const horaFormatada = dataCurso.toLocaleString('pt-BR', { timeStyle: 'short' });
            const dataFormatada = dataCurso.toLocaleDateString('pt-BR');

            // Notificação de 24 Horas (Janela: entre 1430 e 1445 minutos)
            const chave24h = `${ag.id}_24h`;
            if (diferencaEmMinutos >= 1430 && diferencaEmMinutos <= 1445 && !notificacoesEnviadas.has(chave24h)) {
                notificacoesEnviadas.add(chave24h);
                console.log(`\n📧 [EMAIL 24H ENVIADO] Para: ${ag.usuarios?.email || 'Sem e-mail'}`);
                console.log(`Olá, ${cliente}! Lembramos que o seu agendamento para "${curso}" será amanhã (${dataFormatada}) às ${horaFormatada}.`);
                console.log(`Em caso de imprevistos, cancele na plataforma com no mínimo 2 horas de antecedência.\n`);
            }

            // Notificação de 3 Horas (Janela: entre 170 e 185 minutos)
            const chave3h = `${ag.id}_3h`;
            if (diferencaEmMinutos >= 170 && diferencaEmMinutos <= 185 && !notificacoesEnviadas.has(chave3h)) {
                notificacoesEnviadas.add(chave3h);
                console.log(`\n🔔 [AVISO 3H ENVIADO] Para: ${ag.usuarios?.email || 'Sem e-mail'}`);
                console.log(`Olá, ${cliente}! Seu atendimento para "${curso}" acontecerá hoje às ${horaFormatada}.`);
                console.log(`Chegue com 10 minutos de antecedência na unidade SENAC.\n`);
            }
        });

        // Limpeza de cache de agendamentos passados para poupar memória
        if (notificacoesEnviadas.size > 2000) {
            notificacoesEnviadas.clear();
        }

    } catch (error) {
        console.error('❌ [CRON ERRO] Falha ao varrer notificações:', error.message);
    }
});

console.log('⏳ Motor de Notificações (CRON) ativado e a aguardar...');