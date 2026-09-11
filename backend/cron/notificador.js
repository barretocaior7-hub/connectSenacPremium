// backend/cron/notificador.js
const cron = require('node-cron');
const supabase = require('../config/database');
const whatsappService = require('../services/whatsappService');
const emailService = require('../services/emailService');

// Conjunto para controle de idempotência (evita reenvio duplicado dentro da janela)
const notificacoesEnviadas = new Set();

async function executarVarreduraNotificacoes() {
    console.log('🤖 [CRON] Executando varredura de notificações e reconfirmações no WhatsApp...');

    try {
        const agora = new Date();

        // Calcula o limite: daqui a 25 horas para cobrir com folga
        const daquiA25Horas = new Date(agora.getTime() + (25 * 60 * 60 * 1000));
        const limiteInferior = agora.toISOString();
        const limiteSuperior = daquiA25Horas.toISOString();

        // 1. Procurar agendamentos ativos que acontecem nas próximas 25h
        const { data: agendamentos, error } = await supabase
            .from('agendamentos')
            .select(`
                id,
                status,
                usuarios ( nome, email, telefone ),
                disponibilidades!inner ( data_hora, cursos ( nome, localizacao ) )
            `)
            .eq('status', 'agendado')
            .gt('disponibilidades.data_hora', limiteInferior)
            .lt('disponibilidades.data_hora', limiteSuperior);

        if (error) throw error;

        if (!agendamentos || agendamentos.length === 0) {
            return { total: 0, disparados: 0 };
        }

        let disparados = 0;

        // 2. Disparar os avisos com tolerância de janela e controle de envio
        for (const ag of agendamentos) {
            if (!ag.disponibilidades || !ag.disponibilidades.data_hora) {
                continue;
            }

            const dataCurso = new Date(ag.disponibilidades.data_hora);
            const diferencaEmMinutos = Math.floor((dataCurso - agora) / (1000 * 60));

            const curso = ag.disponibilidades.cursos?.nome || 'Curso não identificado';
            const localizacao = ag.disponibilidades.cursos?.localizacao || 'SENAC - Santo Antônio de Jesus, BA';
            const cliente = ag.usuarios?.nome || 'Modelo';
            const telefone = ag.usuarios?.telefone;
            const horaFormatada = dataCurso.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
            const dataFormatada = dataCurso.toLocaleDateString('pt-BR');

            // -------------------------------------------------------------
            // RECONFIRMAÇÃO 2 HORAS ANTES (Janela: entre 110 e 135 minutos)
            // Solicita ao modelo se ele confirma sua presença via E-mail (Resend) e WhatsApp
            // -------------------------------------------------------------
            const chave2h = `${ag.id}_reconfirmacao_2h`;
            if (diferencaEmMinutos >= 110 && diferencaEmMinutos <= 135 && !notificacoesEnviadas.has(chave2h)) {
                notificacoesEnviadas.add(chave2h);
                disparados++;

                const emailCliente = ag.usuarios?.email;

                // Disparo prioritário de E-mail via Resend
                if (emailCliente) {
                    await emailService.enviarEmailReconfirmacao2h({
                        to: emailCliente,
                        nome: cliente,
                        curso,
                        dataHora: ag.disponibilidades.data_hora,
                        localizacao
                    });
                }

                // Disparo complementar via WhatsApp
                const msg2h = whatsappService.montarMensagemReconfirmacao2h({
                    nome: cliente,
                    curso,
                    dataHora: ag.disponibilidades.data_hora,
                    localizacao
                });

                await whatsappService.enviarMensagemWhatsApp({
                    telefone,
                    mensagem: msg2h,
                    tipo: 'RECONFIRMACAO_2H_WHATSAPP'
                });
            }

            // -------------------------------------------------------------
            // Lembrete de 24 Horas (Janela: entre 1420 e 1450 minutos)
            // -------------------------------------------------------------
            const chave24h = `${ag.id}_24h`;
            if (diferencaEmMinutos >= 1420 && diferencaEmMinutos <= 1450 && !notificacoesEnviadas.has(chave24h)) {
                notificacoesEnviadas.add(chave24h);
                disparados++;

                console.log(`\n📧 [LEMBRETE 24H] Para: ${ag.usuarios?.email || 'Sem e-mail'} | Tel: ${telefone}`);
                console.log(`Olá, ${cliente}! Lembramos que seu atendimento para "${curso}" será amanhã (${dataFormatada}) às ${horaFormatada}.`);
                console.log(`Compareça com 20 minutos de antecedência. Em caso de imprevistos, cancele na plataforma com no mínimo 2 horas de antecedência.\n`);
            }
        }

        // Limpeza de cache de agendamentos passados para poupar memória
        if (notificacoesEnviadas.size > 2000) {
            notificacoesEnviadas.clear();
        }

        return { total: agendamentos.length, disparados };
    } catch (error) {
        console.error('❌ [CRON ERRO] Falha ao varrer notificações:', error.message);
        return { erro: error.message };
    }
}

// Expressão CRON: '* * * * *' (Executar a cada minuto)
cron.schedule('* * * * *', async () => {
    await executarVarreduraNotificacoes();
});

console.log('⏳ Motor de Notificações e Reconfirmações WhatsApp (CRON) ativado e aguardando...');

module.exports = {
    executarVarreduraNotificacoes,
    notificacoesEnviadas
};
