// backend/utils/dateUtils.js

/**
 * Retorna a data/hora inicial de hoje (00:00:00.000) no fuso horário do Brasil (America/Sao_Paulo, UTC-3).
 * Garante consistência perfeita entre ambientes de deploy (Vercel/UTC) e ambiente local.
 */
function getInicioDeHojeBrasil() {
    const agora = new Date();
    const formatoData = new Intl.DateTimeFormat('en-CA', {
        timeZone: 'America/Sao_Paulo',
        year: 'numeric',
        month: '2-digit',
        day: '2-digit'
    });
    const hojeStr = formatoData.format(agora);
    return new Date(`${hojeStr}T00:00:00-03:00`);
}

module.exports = {
    getInicioDeHojeBrasil
};
