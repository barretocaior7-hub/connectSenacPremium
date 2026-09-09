// public/js/senac-departamentos.js
// Relação Oficial de Departamentos do SENAC (Referência: cloud.plataforma.senac.br)

const SENAC_DEPARTAMENTOS = [
  { sigla: "DR/BA", nome: "Departamento Regional Bahia (DR/BA)", uf: "BA", principal: true },
  { sigla: "DN",    nome: "Departamento Nacional (DN)", uf: "BR" },
  { sigla: "DR/AC", nome: "Departamento Regional Acre (DR/AC)", uf: "AC" },
  { sigla: "DR/AL", nome: "Departamento Regional Alagoas (DR/AL)", uf: "AL" },
  { sigla: "DR/AM", nome: "Departamento Regional Amazonas (DR/AM)", uf: "AM" },
  { sigla: "DR/AP", nome: "Departamento Regional Amapá (DR/AP)", uf: "AP" },
  { sigla: "DR/CE", nome: "Departamento Regional Ceará (DR/CE)", uf: "CE" },
  { sigla: "DR/DF", nome: "Departamento Regional Distrito Federal (DR/DF)", uf: "DF" },
  { sigla: "DR/ES", nome: "Departamento Regional Espírito Santo (DR/ES)", uf: "ES" },
  { sigla: "DR/GO", nome: "Departamento Regional Goiás (DR/GO)", uf: "GO" },
  { sigla: "DR/MA", nome: "Departamento Regional Maranhão (DR/MA)", uf: "MA" },
  { sigla: "DR/MG", nome: "Departamento Regional Minas Gerais (DR/MG)", uf: "MG" },
  { sigla: "DR/MS", nome: "Departamento Regional Mato Grosso do Sul (DR/MS)", uf: "MS" },
  { sigla: "DR/MT", nome: "Departamento Regional Mato Grosso (DR/MT)", uf: "MT" },
  { sigla: "DR/PA", nome: "Departamento Regional Pará (DR/PA)", uf: "PA" },
  { sigla: "DR/PB", nome: "Departamento Regional Paraíba (DR/PB)", uf: "PB" },
  { sigla: "DR/PE", nome: "Departamento Regional Pernambuco (DR/PE)", uf: "PE" },
  { sigla: "DR/PI", nome: "Departamento Regional Piauí (DR/PI)", uf: "PI" },
  { sigla: "DR/PR", nome: "Departamento Regional Paraná (DR/PR)", uf: "PR" },
  { sigla: "DR/RJ", nome: "Departamento Regional Rio de Janeiro (DR/RJ)", uf: "RJ" },
  { sigla: "DR/RN", nome: "Departamento Regional Rio Grande do Norte (DR/RN)", uf: "RN" },
  { sigla: "DR/RO", nome: "Departamento Regional Rondônia (DR/RO)", uf: "RO" },
  { sigla: "DR/RR", nome: "Departamento Regional Roraima (DR/RR)", uf: "RR" },
  { sigla: "DR/RS", nome: "Departamento Regional Rio Grande do Sul (DR/RS)", uf: "RS" },
  { sigla: "DR/SC", nome: "Departamento Regional Santa Catarina (DR/SC)", uf: "SC" },
  { sigla: "DR/SE", nome: "Departamento Regional Sergipe (DR/SE)", uf: "SE" },
  { sigla: "DR/SP", nome: "Departamento Regional São Paulo (DR/SP)", uf: "SP" },
  { sigla: "DR/TO", nome: "Departamento Regional Tocantins (DR/TO)", uf: "TO" }
];

const STORAGE_KEY_DEPTO = 'senac_departamento_administrado';

// Retorna o departamento ativo no navegador (padrão: DR/BA)
function getDepartamentoAtivo() {
  return localStorage.getItem(STORAGE_KEY_DEPTO) || 'DR/BA';
}

// Atualiza o departamento ativo e notifica observadores
function setDepartamentoAtivo(sigla) {
  if (!sigla) return;
  localStorage.setItem(STORAGE_KEY_DEPTO, sigla);
  window.dispatchEvent(new CustomEvent('senacDepartamentoChanged', { detail: { departamento: sigla } }));
}

// Popula um elemento <select> com os 28 departamentos
function popularSelectDepartamentos(selectEl, selectedVal, incluirTodos = false) {
  if (!selectEl) return;
  const valorAtual = selectedVal || getDepartamentoAtivo();
  selectEl.innerHTML = '';

  if (incluirTodos) {
    const optTodos = document.createElement('option');
    optTodos.value = 'TODOS';
    optTodos.textContent = 'Todos os Departamentos (Visão Global)';
    selectEl.appendChild(optTodos);
  }

  SENAC_DEPARTAMENTOS.forEach(dep => {
    const opt = document.createElement('option');
    opt.value = dep.sigla;
    opt.textContent = dep.nome;
    if (dep.sigla === valorAtual) opt.selected = true;
    selectEl.appendChild(opt);
  });
}

// Retorna HTML de <option> para inserção rápida em tabelas
function gerarOpcoesSelectDepartamentos(selectedSigla, incluirTodos = false) {
  let html = '';
  if (incluirTodos) {
    html += '<option value="TODOS"' + (selectedSigla === 'TODOS' ? ' selected' : '') + '>Todos os Departamentos</option>';
  }
  SENAC_DEPARTAMENTOS.forEach(dep => {
    const isSelected = dep.sigla === selectedSigla ? ' selected' : '';
    html += '<option value="' + dep.sigla + '"' + isSelected + '>' + dep.sigla + '</option>';
  });
  return html;
}

// Torna acessível globalmente
window.SENAC_DEPARTAMENTOS = SENAC_DEPARTAMENTOS;
window.getDepartamentoAtivo = getDepartamentoAtivo;
window.setDepartamentoAtivo = setDepartamentoAtivo;
window.popularSelectDepartamentos = popularSelectDepartamentos;
window.gerarOpcoesSelectDepartamentos = gerarOpcoesSelectDepartamentos;
