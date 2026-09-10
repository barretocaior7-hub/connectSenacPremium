// backend/services/whatsappService.js
// Servico de Notificacoes e Integracao WhatsApp do Connect Senac

const https = require('https');
const http = require('http');

/**
 * Formata qualquer numero de telefone para o padrao internacional do WhatsApp (E.164 sem +)
 * Exemplo: "(71) 93186-4000" -> "5571931864000"
 */
function formatarNumeroWhatsApp(telefone) {
    if (!telefone) return null;
    let digitos = String(telefone).replace(/\D/g, '');
    if (!digitos) return null;

    // Se tiver 10 ou 11 digitos (DDD + numero brasileiro sem 55), prefixa com 55
    if (digitos.length === 10 || digitos.length === 11) {
        digitos = '55' + digitos;
    }
    return digitos;
}

/**
 * Gera o link direto wa.me para abertura no app ou web
 */
function gerarLinkWhatsApp(telefone, mensagem) {
    const num = formatarNumeroWhatsApp(telefone);
    if (!num) return null;
    return `https://wa.me/${num}?text=${encodeURIComponent(mensagem)}`;
}

/**
 * Formata data e hora legivel em pt-BR
 */
function formatarDataHoraPtBR(dataHoraIso) {
    try {
        const d = new Date(dataHoraIso);
        const data = d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' });
        const hora = d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
        return { data, hora, dataHoraFormatada: `${data} as ${hora}` };
    } catch (_) {
        return { data: '--', hora: '--', dataHoraFormatada: '--' };
    }
}

/**
 * Monta o texto da mensagem de confirmacao imediata ao agendar
 */
function montarMensagemConfirmacao({ nome, curso, dataHora, localizacao }) {
    const { data, hora } = formatarDataHoraPtBR(dataHora);
    const nomeFormatado = nome ? nome.split(' ')[0] : 'Modelo';
    const local = localizacao || 'SENAC - Santo Antonio de Jesus, BA';

    return `🎉 *Agendamento Confirmado - Connect Senac*

Ola, *${nomeFormatado}*! Seu agendamento para modelo voluntario no SENAC foi confirmado com sucesso.

📚 *Procedimento:* ${curso || 'Atendimento Pratico'}
📅 *Data:* ${data}
⏰ *Horario:* ${hora}
📍 *Endereco:* ${local}

⚠️ *IMPORTANTE:* Por favor, compareca com *20 minutos de antecedencia* ao local para acolhimento e preparacao.

🔗 Acesse seu painel para ver detalhes ou tracar rota no mapa:
https://connect-senac-premium.vercel.app/painel.html

Agradecemos sua participacao na formacao dos nossos alunos! 🎓`;
}

/**
 * Monta o texto da mensagem de lembrete e reconfirmacao com 2 horas de antecedencia
 */
function montarMensagemReconfirmacao2h({ nome, curso, dataHora, localizacao }) {
    const { hora } = formatarDataHoraPtBR(dataHora);
    const nomeFormatado = nome ? nome.split(' ')[0] : 'Modelo';
    const local = localizacao || 'SENAC - Santo Antonio de Jesus, BA';

    return `⏰ *Lembrete & Confirmacao de Presenca - Connect Senac*

Ola, *${nomeFormatado}*! Seu atendimento como modelo para *${curso || 'Curso Pratico'}* esta agendado para hoje as *${hora}* (daqui a 2 horas).

📍 *Local:* ${local}
⚠️ *Lembrete:* Compareca com *20 minutos de antecedencia*.

Voce confirma sua presenca hoje?
👉 Responda *SIM* para confirmar ou gerencie seu agendamento em:
🔗 https://connect-senac-premium.vercel.app/painel.html

Caso tenha algum imprevisto e precise cancelar, por favor informe com antecedencia para liberarmos a vaga a outro participante.`;
}

/**
 * Envia mensagem para o WhatsApp do usuario via Gateway de API (se configurado)
 * ou registra o link direto e log formatado
 */
async function enviarMensagemWhatsApp({ telefone, mensagem, tipo = 'NOTIFICACAO' }) {
    const numeroLimpo = formatarNumeroWhatsApp(telefone);
    const link = gerarLinkWhatsApp(telefone, mensagem);

    if (!numeroLimpo) {
        console.warn(`⚠️ [WHATSAPP ${tipo}] Telefone invalido ou ausente:`, telefone);
        return { sucesso: false, erro: 'Telefone invalido ou ausente', link: null };
    }

    console.log(`\n=============================================================`);
    console.log(`📲 [WHATSAPP ${tipo.toUpperCase()}] DISPARO DE NOTIFICACAO`);
    console.log(`Destinatario: +${numeroLimpo}`);
    console.log(`Mensagem:\n${mensagem}`);
    console.log(`Link wa.me direto: ${link}`);
    console.log(`=============================================================\n`);

    // Se houver um Webhook / Gateway de WhatsApp configurado no .env
    const apiUrl = process.env.WHATSAPP_API_URL;
    const apiToken = process.env.WHATSAPP_API_TOKEN;

    if (apiUrl) {
        try {
            const payload = JSON.stringify({
                number: numeroLimpo,
                phone: numeroLimpo,
                message: mensagem,
                text: mensagem
            });

            const parsedUrl = new URL(apiUrl);
            const transport = parsedUrl.protocol === 'https:' ? https : http;

            const options = {
                hostname: parsedUrl.hostname,
                port: parsedUrl.port || (parsedUrl.protocol === 'https:' ? 443 : 80),
                path: parsedUrl.pathname + parsedUrl.search,
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Content-Length': Buffer.byteLength(payload),
                    ...(apiToken ? { 'Authorization': `Bearer ${apiToken}`, 'apikey': apiToken, 'Client-Token': apiToken } : {})
                }
            };

            await new Promise((resolve, reject) => {
                const req = transport.request(options, (res) => {
                    let data = '';
                    res.on('data', chunk => data += chunk);
                    res.on('end', () => resolve(data));
                });
                req.on('error', err => reject(err));
                req.write(payload);
                req.end();
            });

            console.log(`✅ [WHATSAPP GATEWAY] Mensagem enviada via API para +${numeroLimpo}`);
        } catch (apiErr) {
            console.error(`❌ [WHATSAPP GATEWAY ERRO] Falha ao enviar via API:`, apiErr.message);
        }
    }

    return {
        sucesso: true,
        telefone: numeroLimpo,
        mensagem,
        link
    };
}

module.exports = {
    formatarNumeroWhatsApp,
    gerarLinkWhatsApp,
    formatarDataHoraPtBR,
    montarMensagemConfirmacao,
    montarMensagemReconfirmacao2h,
    enviarMensagemWhatsApp
};
