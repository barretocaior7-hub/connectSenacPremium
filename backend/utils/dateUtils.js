// backend/utils/dateUtils.js

/**
 * Mapeamento dos fusos horários oficiais IANA para cada Departamento Regional do SENAC.
 * O Brasil possui 4 fusos horários:
 * - UTC-5: Acre (DR/AC)
 * - UTC-4: Amazonas (DR/AM), Rondônia (DR/RO), Roraima (DR/RR), Mato Grosso (DR/MT), Mato Grosso do Sul (DR/MS)
 * - UTC-3: Regiões Sul, Sudeste, Nordeste, Goiás, Tocantins, Distrito Federal, Pará e Amapá
 * - UTC-2: Fernando de Noronha (PE)
 */
const DEPARTAMENTOS_TIMEZONES = {
    'DR/AC': { timeZone: 'America/Rio_Branco', offset: -5, fusoDesc: 'Horário do Acre (UTC-5)', sigla: 'ACT' },
    'DR/AM': { timeZone: 'America/Manaus', offset: -4, fusoDesc: 'Horário do Amazonas (UTC-4)', sigla: 'AMT' },
    'DR/RO': { timeZone: 'America/Porto_Velho', offset: -4, fusoDesc: 'Horário de Rondônia (UTC-4)', sigla: 'AMT' },
    'DR/RR': { timeZone: 'America/Boa_Vista', offset: -4, fusoDesc: 'Horário de Roraima (UTC-4)', sigla: 'AMT' },
    'DR/MT': { timeZone: 'America/Cuiaba', offset: -4, fusoDesc: 'Horário do Mato Grosso (UTC-4)', sigla: 'AMT' },
    'DR/MS': { timeZone: 'America/Campo_Grande', offset: -4, fusoDesc: 'Horário do Mato Grosso do Sul (UTC-4)', sigla: 'AMT' },
    // Fuso Padrão Oficial de Brasília (UTC-3)
    'DEFAULT': { timeZone: 'America/Sao_Paulo', offset: -3, fusoDesc: 'Horário Oficial de Brasília (UTC-3)', sigla: 'BRT' }
};

function extrairSiglaDepartamento(departamento) {
    if (!departamento || typeof departamento !== 'string') return 'DEFAULT';
    const norm = departamento.trim().toUpperCase();
    if (norm.startsWith('DR/')) return norm;
    if (norm.length === 2) return `DR/${norm}`;
    const match = norm.match(/\b(AC|AL|AP|AM|BA|CE|DF|ES|GO|MA|MT|MS|MG|PA|PB|PR|PE|PI|RJ|RN|RS|RO|RR|SC|SP|SE|TO)\b/);
    if (match) return `DR/${match[1]}`;
    return 'DEFAULT';
}

function getInfoFusoDepartamento(departamento) {
    const chave = extrairSiglaDepartamento(departamento);
    const item = DEPARTAMENTOS_TIMEZONES[chave] || DEPARTAMENTOS_TIMEZONES['DEFAULT'];
    return {
        ...item,
        siglaFuso: item.sigla,
        offsetStr: `UTC${item.offset < 0 ? item.offset : '+' + item.offset}`
    };
}

function getTimezoneForDepartamento(departamento) {
    return getInfoFusoDepartamento(departamento).timeZone;
}

function getFusoDescricao(departamento) {
    return getInfoFusoDepartamento(departamento).fusoDesc;
}

/**
 * Retorna a data/hora inicial de hoje (00:00:00.000) no fuso horário do departamento especificado.
 */
function getInicioDeHojeNoFuso(departamento = 'DR/BA') {
    const { timeZone, offset } = getInfoFusoDepartamento(departamento);
    const agora = new Date();
    const formatoData = new Intl.DateTimeFormat('en-CA', {
        timeZone,
        year: 'numeric',
        month: '2-digit',
        day: '2-digit'
    });
    const hojeStr = formatoData.format(agora);
    const sinal = offset < 0 ? '-' : '+';
    const offsetAbs = Math.abs(offset).toString().padStart(2, '0');
    return new Date(`${hojeStr}T00:00:00${sinal}${offsetAbs}:00`);
}

/**
 * Mantém compatibilidade com a assinatura anterior (fuso padrão Brasil)
 */
function getInicioDeHojeBrasil() {
    return getInicioDeHojeNoFuso('DR/BA');
}

/**
 * Obtém a data/hora atual formatada e os dados do fuso horário da região informada
 */
function getAgoraNoFuso(departamento = 'DR/BA') {
    const { timeZone, fusoDesc, sigla, offset } = getInfoFusoDepartamento(departamento);
    const agora = new Date();

    const formatadorHora = new Intl.DateTimeFormat('pt-BR', {
        timeZone,
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: false
    });

    const formatadorData = new Intl.DateTimeFormat('pt-BR', {
        timeZone,
        weekday: 'long',
        day: '2-digit',
        month: 'long',
        year: 'numeric'
    });

    return {
        iso: agora.toISOString(),
        horaAtualFormatada: formatadorHora.format(agora),
        dataAtualFormatada: formatadorData.format(agora),
        timezone: timeZone,
        fusoDesc,
        siglaFuso: sigla,
        offsetHoras: offset
    };
}

/**
 * Interpreta com precisão qualquer formato de data/hora (ISO, SQL, local sem offset)
 * aplicando o fuso horário correto do Departamento Regional correspondente.
 */
function parseDataNoFuso(dataHora, departamento = 'DR/BA') {
    if (!dataHora) return null;
    if (dataHora instanceof Date) return isNaN(dataHora.getTime()) ? null : dataHora;

    const str = String(dataHora).trim();
    if (!str) return null;

    // Caso a string já possua indicador de fuso explícito (Z ou offset +/-HH:MM / +/-HHMM / +/-HH)
    if (/(?:Z|[+-]\d{2}(?::?\d{2})?)$/i.test(str)) {
        const d = new Date(str);
        return isNaN(d.getTime()) ? null : d;
    }

    // Se não tiver indicador de fuso explícito (ex: "2026-09-15 14:30:00" ou "2026-09-15T14:30"),
    // associamos ao offset oficial do Departamento Regional (ex: UTC-3 para DR/BA)
    const { offset } = getInfoFusoDepartamento(departamento);
    const sinal = offset < 0 ? '-' : '+';
    const offsetAbs = Math.abs(offset).toString().padStart(2, '0');
    const isoFormatado = str.replace(' ', 'T');
    
    // Tratamento de segundos caso não existam
    let dataCompleta = isoFormatado;
    if (/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(isoFormatado)) {
        dataCompleta += ':00';
    }

    const dComOffset = new Date(`${dataCompleta}${sinal}${offsetAbs}:00`);
    if (!isNaN(dComOffset.getTime())) {
        return dComOffset;
    }

    const dFallback = new Date(str);
    return isNaN(dFallback.getTime()) ? null : dFallback;
}

/**
 * Verifica se um horário de curso/aula ainda está no futuro em relação ao momento atual.
 * Permite uma margem de segurança em minutos (ex: tolerância para início recente).
 */
function isHorarioFuturo(dataHora, departamento = 'DR/BA', margemMinutos = -10) {
    if (!dataHora) return false;
    const dataAlvo = parseDataNoFuso(dataHora, departamento);
    if (!dataAlvo || isNaN(dataAlvo.getTime())) return false;

    const agora = new Date();
    const limite = new Date(agora.getTime() + (margemMinutos * 60 * 1000));
    return dataAlvo.getTime() > limite.getTime();
}

module.exports = {
    DEPARTAMENTOS_TIMEZONES,
    getTimezoneForDepartamento,
    getInfoFusoDepartamento,
    getFusoDescricao,
    getInicioDeHojeNoFuso,
    getInicioDeHojeBrasil,
    getAgoraNoFuso,
    parseDataNoFuso,
    isHorarioFuturo
};

