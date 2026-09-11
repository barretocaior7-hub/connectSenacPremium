// backend/services/emailService.js
// Serviço de Notificações por E-mail via Resend do Connect Senac
const { Resend } = require('resend');

const apiKey = process.env.RESEND_API_KEY;
const resendClient = apiKey ? new Resend(apiKey) : null;
const remetentePadrao = process.env.EMAIL_FROM || 'Connect Senac <onboarding@resend.dev>';

/**
 * Formata data e hora legível em pt-BR
 */
function formatarDataHoraPtBR(dataHoraIso) {
    try {
        const d = new Date(dataHoraIso);
        const data = d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' });
        const diaSemana = d.toLocaleDateString('pt-BR', { weekday: 'long' });
        const hora = d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
        return { data, diaSemana, hora, dataHoraFormatada: `${data} às ${hora}` };
    } catch (_) {
        return { data: '--', diaSemana: '', hora: '--', dataHoraFormatada: '--' };
    }
}

/**
 * Template HTML institucional para Confirmação de Agendamento
 */
function montarHtmlConfirmacao({ nome, curso, dataHora, localizacao }) {
    const { data, diaSemana, hora } = formatarDataHoraPtBR(dataHora);
    const primeiroNome = nome ? nome.split(' ')[0] : 'Modelo';
    const local = localizacao || 'SENAC - Santo Antônio de Jesus, BA';

    return `
<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Agendamento Confirmado - Connect Senac</title>
</head>
<body style="margin: 0; padding: 0; background-color: #f4f7fb; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #1e293b;">
  <table width="100%" border="0" cellspacing="0" cellpadding="0" style="background-color: #f4f7fb; padding: 30px 10px;">
    <tr>
      <td align="center">
        <!-- Container Principal -->
        <table width="100%" max-width="600" border="0" cellspacing="0" cellpadding="0" style="max-width: 600px; background-color: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 20px rgba(0, 74, 141, 0.08); border: 1px solid #e2e8f0;">
          
          <!-- Topo com Identidade Visual SENAC -->
          <tr>
            <td style="background: linear-gradient(135deg, #004a8d 0%, #002d57 100%); padding: 35px 30px; text-align: center;">
              <table width="100%" border="0" cellspacing="0" cellpadding="0">
                <tr>
                  <td align="center">
                    <div style="display: inline-block; background-color: rgba(255, 255, 255, 0.15); border-radius: 50px; padding: 8px 20px; margin-bottom: 12px; border: 1px solid rgba(255, 255, 255, 0.2);">
                      <span style="color: #ffffff; font-size: 13px; font-weight: 700; text-transform: uppercase; letter-spacing: 1px;">Connect Senac • Modelo Voluntário</span>
                    </div>
                    <h1 style="color: #ffffff; font-size: 24px; font-weight: 800; margin: 0 0 8px 0;">🎉 Agendamento Confirmado!</h1>
                    <p style="color: rgba(255, 255, 255, 0.85); font-size: 15px; margin: 0;">Sua vaga para a aula prática foi reservada com sucesso.</p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Corpo do E-mail -->
          <tr>
            <td style="padding: 35px 30px;">
              <p style="font-size: 16px; line-height: 1.5; color: #334155; margin: 0 0 20px 0;">
                Olá, <strong>${primeiroNome}</strong>!
              </p>
              <p style="font-size: 15px; line-height: 1.6; color: #64748b; margin: 0 0 25px 0;">
                Agradecemos a sua participação como modelo voluntário no <strong>SENAC</strong>. Sua presença é fundamental para a formação e prática de excelência dos nossos alunos.
              </p>

              <!-- Card de Detalhes do Procedimento -->
              <table width="100%" border="0" cellspacing="0" cellpadding="0" style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 12px; margin-bottom: 25px;">
                <tr>
                  <td style="padding: 22px;">
                    <table width="100%" border="0" cellspacing="0" cellpadding="0">
                      <tr>
                        <td style="padding-bottom: 14px; border-bottom: 1px solid #e2e8f0;">
                          <span style="font-size: 12px; font-weight: 700; color: #f28b00; text-transform: uppercase; letter-spacing: 0.5px; display: block; margin-bottom: 4px;">Procedimento / Curso</span>
                          <strong style="font-size: 18px; color: #004a8d;">${curso || 'Atendimento Prático'}</strong>
                        </td>
                      </tr>
                      <tr>
                        <td style="padding: 14px 0; border-bottom: 1px solid #e2e8f0;">
                          <table width="100%" border="0" cellspacing="0" cellpadding="0">
                            <tr>
                              <td width="50%" style="vertical-align: top;">
                                <span style="font-size: 12px; font-weight: 600; color: #64748b; display: block; margin-bottom: 2px;">📅 Data</span>
                                <strong style="font-size: 15px; color: #1e293b;">${data} (${diaSemana})</strong>
                              </td>
                              <td width="50%" style="vertical-align: top;">
                                <span style="font-size: 12px; font-weight: 600; color: #64748b; display: block; margin-bottom: 2px;">⏰ Horário de Início</span>
                                <strong style="font-size: 16px; color: #004a8d;">${hora}</strong>
                              </td>
                            </tr>
                          </table>
                        </td>
                      </tr>
                      <tr>
                        <td style="padding-top: 14px;">
                          <span style="font-size: 12px; font-weight: 600; color: #64748b; display: block; margin-bottom: 2px;">📍 Local do Atendimento</span>
                          <span style="font-size: 14px; color: #1e293b; font-weight: 500;">${local}</span>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>

              <!-- Destaque Importante de 20 minutos de antecedência -->
              <table width="100%" border="0" cellspacing="0" cellpadding="0" style="background-color: #fff7ed; border-left: 4px solid #f28b00; border-radius: 8px; margin-bottom: 30px;">
                <tr>
                  <td style="padding: 16px 20px;">
                    <div style="font-size: 14px; font-weight: 700; color: #9a3412; margin-bottom: 4px;">
                      ⚠️ IMPORTANTE: Compareça com 20 minutos de antecedência
                    </div>
                    <div style="font-size: 13px; line-height: 1.5; color: #7c2d12;">
                      Pedimos a gentileza de chegar <strong>20 minutos antes</strong> para o acolhimento, orientações da equipe de saúde/beleza e preparação do procedimento.
                    </div>
                  </td>
                </tr>
              </table>

              <!-- Botão CTA Principal -->
              <table width="100%" border="0" cellspacing="0" cellpadding="0" style="margin-bottom: 25px;">
                <tr>
                  <td align="center">
                    <a href="https://connect-senac-premium.vercel.app/painel.html" target="_blank" style="display: inline-block; background-color: #004a8d; color: #ffffff; text-decoration: none; font-size: 15px; font-weight: 700; padding: 14px 34px; border-radius: 8px; box-shadow: 0 4px 12px rgba(0, 74, 141, 0.25);">
                      Acessar Meu Painel de Agendamentos →
                    </a>
                  </td>
                </tr>
              </table>

              <p style="font-size: 13px; line-height: 1.6; color: #94a3b8; text-align: center; margin: 0;">
                Em caso de imprevisto, solicitamos que faça o cancelamento pelo painel com no mínimo <strong>2 horas de antecedência</strong> para liberarmos a vaga a outro modelo voluntário.
              </p>
            </td>
          </tr>

          <!-- Rodapé -->
          <tr>
            <td style="background-color: #f8fafc; padding: 25px 30px; text-align: center; border-top: 1px solid #e2e8f0;">
              <p style="font-size: 12px; color: #64748b; margin: 0 0 6px 0;">
                <strong>Connect Senac</strong> • Sistema Integrado de Práticas Profissionais
              </p>
              <p style="font-size: 11px; color: #94a3b8; margin: 0;">
                Serviço 100% gratuito voltado à formação pedagógica dos estudantes do SENAC.
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>
    `;
}

/**
 * Template HTML para Lembrete e Reconfirmação de 2 Horas de Antecedência
 */
function montarHtmlReconfirmacao2h({ nome, curso, dataHora, localizacao }) {
    const { hora } = formatarDataHoraPtBR(dataHora);
    const primeiroNome = nome ? nome.split(' ')[0] : 'Modelo';
    const local = localizacao || 'SENAC - Santo Antônio de Jesus, BA';

    return `
<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Lembrete: Seu atendimento começa em 2 horas! - Connect Senac</title>
</head>
<body style="margin: 0; padding: 0; background-color: #f4f7fb; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #1e293b;">
  <table width="100%" border="0" cellspacing="0" cellpadding="0" style="background-color: #f4f7fb; padding: 30px 10px;">
    <tr>
      <td align="center">
        <!-- Container Principal -->
        <table width="100%" max-width="600" border="0" cellspacing="0" cellpadding="0" style="max-width: 600px; background-color: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 20px rgba(0, 74, 141, 0.08); border: 1px solid #e2e8f0;">
          
          <!-- Topo Urgência Laranja / Azul -->
          <tr>
            <td style="background: linear-gradient(135deg, #f28b00 0%, #d97706 100%); padding: 32px 30px; text-align: center;">
              <div style="display: inline-block; background-color: rgba(255, 255, 255, 0.2); border-radius: 50px; padding: 6px 18px; margin-bottom: 10px; border: 1px solid rgba(255, 255, 255, 0.3);">
                <span style="color: #ffffff; font-size: 13px; font-weight: 700; text-transform: uppercase; letter-spacing: 1px;">⏰ Lembrete de Presença</span>
              </div>
              <h1 style="color: #ffffff; font-size: 23px; font-weight: 800; margin: 0 0 6px 0;">Seu atendimento é hoje às ${hora}!</h1>
              <p style="color: #ffffff; font-size: 14px; margin: 0; opacity: 0.95;">Faltam apenas 2 horas para o início da sua sessão prática.</p>
            </td>
          </tr>

          <!-- Corpo do E-mail -->
          <tr>
            <td style="padding: 35px 30px;">
              <p style="font-size: 16px; line-height: 1.5; color: #334155; margin: 0 0 16px 0;">
                Olá, <strong>${primeiroNome}</strong>!
              </p>
              <p style="font-size: 15px; line-height: 1.6; color: #64748b; margin: 0 0 24px 0;">
                Passando para lembrar que o seu procedimento como modelo voluntário no SENAC acontecerá <strong>hoje às ${hora}</strong>.
              </p>

              <!-- Resumo Rápido -->
              <table width="100%" border="0" cellspacing="0" cellpadding="0" style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 12px; margin-bottom: 24px;">
                <tr>
                  <td style="padding: 20px;">
                    <div style="margin-bottom: 12px;">
                      <span style="font-size: 12px; font-weight: 600; color: #64748b; text-transform: uppercase;">Procedimento:</span>
                      <div style="font-size: 17px; font-weight: 700; color: #004a8d;">${curso || 'Curso Prático'}</div>
                    </div>
                    <div>
                      <span style="font-size: 12px; font-weight: 600; color: #64748b; text-transform: uppercase;">Localização:</span>
                      <div style="font-size: 14px; font-weight: 500; color: #1e293b;">${local}</div>
                    </div>
                  </td>
                </tr>
              </table>

              <!-- Aviso de 20 minutos -->
              <table width="100%" border="0" cellspacing="0" cellpadding="0" style="background-color: #eff6ff; border-left: 4px solid #004a8d; border-radius: 8px; margin-bottom: 28px;">
                <tr>
                  <td style="padding: 14px 18px;">
                    <div style="font-size: 14px; font-weight: 700; color: #004a8d; margin-bottom: 2px;">
                      📍 Lembrete de Chegada
                    </div>
                    <div style="font-size: 13px; line-height: 1.5; color: #1e40af;">
                      Por favor, chegue com <strong>20 minutos de antecedência</strong> para garantir o melhor atendimento e início pontual da aula.
                    </div>
                  </td>
                </tr>
              </table>

              <!-- Ação / Gerenciamento -->
              <table width="100%" border="0" cellspacing="0" cellpadding="0" style="margin-bottom: 25px;">
                <tr>
                  <td align="center">
                    <a href="https://connect-senac-premium.vercel.app/painel.html" target="_blank" style="display: inline-block; background-color: #f28b00; color: #ffffff; text-decoration: none; font-size: 15px; font-weight: 700; padding: 14px 34px; border-radius: 8px; box-shadow: 0 4px 12px rgba(242, 139, 0, 0.3);">
                      Confirmar Presença / Ver no Painel →
                    </a>
                  </td>
                </tr>
              </table>

              <p style="font-size: 13px; line-height: 1.6; color: #94a3b8; text-align: center; margin: 0;">
                Nossos alunos e professores estão aguardando você! Caso tenha algum imprevisto grave, contate a coordenação pelo painel.
              </p>
            </td>
          </tr>

          <!-- Rodapé -->
          <tr>
            <td style="background-color: #f8fafc; padding: 25px 30px; text-align: center; border-top: 1px solid #e2e8f0;">
              <p style="font-size: 12px; color: #64748b; margin: 0 0 6px 0;">
                <strong>Connect Senac</strong> • Atendimento Prático Supervisionado
              </p>
              <p style="font-size: 11px; color: #94a3b8; margin: 0;">
                Este é um e-mail automático de lembrete do seu agendamento.
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>
    `;
}

/**
 * Envia um e-mail genérico utilizando o Resend
 */
async function enviarEmail({ to, subject, html, tipo = 'EMAIL' }) {
    if (!to) {
        console.warn(`⚠️ [RESEND ${tipo}] Destinatário de e-mail não informado.`);
        return { sucesso: false, erro: 'Destinatário ausente' };
    }

    console.log(`\n=============================================================`);
    console.log(`📧 [RESEND ${tipo.toUpperCase()}] DISPARO DE E-MAIL`);
    console.log(`Para: ${to}`);
    console.log(`Assunto: ${subject}`);
    console.log(`Remetente: ${remetentePadrao}`);
    console.log(`=============================================================\n`);

    if (!resendClient) {
        console.warn(`⚠️ [RESEND ${tipo}] RESEND_API_KEY não configurada no arquivo .env.`);
        return { sucesso: false, erro: 'RESEND_API_KEY ausente', simulado: true };
    }

    try {
        const { data, error } = await resendClient.emails.send({
            from: remetentePadrao,
            to: [to],
            subject: subject,
            html: html
        });

        if (error) {
            console.error(`❌ [RESEND ${tipo} ERRO]:`, error);
            return { sucesso: false, erro: error.message || error };
        }

        console.log(`✅ [RESEND ${tipo}] E-mail enviado com sucesso! ID:`, data?.id);
        return { sucesso: true, id: data?.id };
    } catch (err) {
        console.error(`❌ [RESEND ${tipo} EXCECAO]:`, err.message);
        return { sucesso: false, erro: err.message };
    }
}

/**
 * Envia e-mail de Confirmação Imediata de Agendamento
 */
async function enviarEmailConfirmacao({ to, nome, curso, dataHora, localizacao }) {
    const html = montarHtmlConfirmacao({ nome, curso, dataHora, localizacao });
    const subject = `🎉 Inscrição Confirmada: ${curso || 'Atendimento Prático'} no SENAC`;
    return await enviarEmail({ to, subject, html, tipo: 'CONFIRMACAO_AGENDAMENTO' });
}

/**
 * Envia e-mail de Lembrete de 2 Horas de Antecedência
 */
async function enviarEmailReconfirmacao2h({ to, nome, curso, dataHora, localizacao }) {
    const html = montarHtmlReconfirmacao2h({ nome, curso, dataHora, localizacao });
    const { hora } = formatarDataHoraPtBR(dataHora);
    const subject = `⏰ Lembrete: Seu procedimento no SENAC é hoje às ${hora} (daqui a 2h)`;
    return await enviarEmail({ to, subject, html, tipo: 'LEMBRETE_2H' });
}

module.exports = {
    enviarEmail,
    enviarEmailConfirmacao,
    enviarEmailReconfirmacao2h,
    montarHtmlConfirmacao,
    montarHtmlReconfirmacao2h,
    formatarDataHoraPtBR
};
