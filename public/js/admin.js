// frontend/js/admin.js

const isLocalDev = window.location.protocol === 'file:' || 
  ((window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') && window.location.port !== '3000');

const API_URL = isLocalDev ? 'http://localhost:3000/api' : `${window.location.origin}/api`;

const token = localStorage.getItem('token');
if (!token) window.location.href = 'index.html';

// Descodificar o JWT para saber o nome e perfil do Admin conectado
let payloadToken = null;
try {
    payloadToken = JSON.parse(atob(token.split('.')[1]));
    if (!payloadToken || !payloadToken.id) throw new Error();
} catch (e) {
    localStorage.removeItem('token');
    window.location.href = 'index.html';
}

if (document.getElementById('userNome')) {
    document.getElementById('userNome').textContent = (payloadToken.email || '').split('@')[0];
}
if (document.getElementById('userPerfil')) {
    document.getElementById('userPerfil').textContent = (payloadToken.perfil || '').toUpperCase();
}

// Se o utilizador for Coordenador, ocultamos a Tab de criar novos colaboradores (RBAC)
if (payloadToken.perfil === 'coordenador') {
    const equipaTab = document.getElementById('equipa-tab');
    if (equipaTab) equipaTab.style.display = 'none';
}

const btnSair = document.getElementById('btnSair');
if (btnSair) {
    btnSair.addEventListener('click', () => {
        localStorage.removeItem('token');
        window.location.href = 'index.html';
    });
}

// ============================================================================
// 1. CARREGAR MÉTRICAS DO DASHBOARD
// ============================================================================
async function carregarMetricas(){
    try {
        const response = await fetch(`${API_URL}/dashboard/metricas`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        if (response.ok) {
            const data = await response.json();
            const elUsuarios = document.getElementById('metricUsuarios');
            const elAgendados = document.getElementById('metricAgendados');
            const elConcluidos = document.getElementById('metricConcluidos');
            const elCancelamento = document.getElementById('metricCancelamento');

            if (elUsuarios) elUsuarios.textContent = data.totalUsuarios;
            if (elAgendados) elAgendados.textContent = data.agendamentos.agendados;
            if (elConcluidos) elConcluidos.textContent = data.agendamentos.concluidos;
            if (elCancelamento) elCancelamento.textContent = data.taxaCancelamento;
        }
    } catch (error) {
        console.error("Erro ao carregar dados do dashboard.");
    }
}

// ============================================================================
// 2. GESTÃO DE UTILIZADORES & HISTÓRICO (MODERAÇÃO)
// ============================================================================
let baseUtilizadores = [];

async function carregarUtilizadores(){
    const tbody = document.getElementById('tabelaUsuariosBody');
    if (!tbody) return;

    try {
        const response = await fetch(`${API_URL}/admin/usuarios`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        baseUtilizadores = await response.json();
        renderizarTabelaUtilizadores(baseUtilizadores);
    } catch (error) {
        tbody.innerHTML = '<tr><td colspan="8" class="text-danger text-center py-4"><i class="bi bi-wifi-off me-2"></i>Erro ao ligar ao servidor.</td></tr>';
    }
}

// Helper para sanitizar saídas contra vulnerabilidades XSS
function escapeHTML(str) {
    if (str === null || str === undefined) return '';
    return String(str)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
}

window.cursosAdminMap = new Map();

function renderizarTabelaUtilizadores(lista){
    const tbody = document.getElementById('tabelaUsuariosBody');
    if (!tbody) return;
    tbody.innerHTML = '';

    if (!Array.isArray(lista) || lista.length === 0) {
        tbody.innerHTML = '<tr><td colspan="8" class="text-center text-muted py-4"><i class="bi bi-search me-1"></i> Nenhum utilizador encontrado com os filtros selecionados.</td></tr>';
        return;
    }

    lista.forEach(user => {
        const nomeFormatado = escapeHTML(user.nome);
        const emailFormatado = escapeHTML(user.email);
        const telFormatado = escapeHTML(user.telefone || '-');
        const cursosAtivosFormatado = escapeHTML(user.cursos_ativos || '-');

        const statusBadge = user.is_bloqueado
            ? '<span class="badge-custom badge-status-bloqueado"><i class="bi bi-lock-fill"></i> Bloqueado</span>'
            : '<span class="badge-custom badge-status-concluido"><i class="bi bi-check-circle-fill"></i> Ativo</span>';

        const telLimpo = (user.telefone || '').replace(/\D/g, '');
        const msgZap = encodeURIComponent(`Olá, ${user.nome}! Aqui é a Coordenação do Connect Senac.`);
        const btnZap = telLimpo
            ? `<a href="https://wa.me/55${telLimpo}?text=${msgZap}" target="_blank" class="btn btn-sm btn-outline-success p-1 px-2" title="Conversar no WhatsApp"><i class="bi bi-whatsapp"></i></a>`
            : '<span class="text-muted small">-</span>';

        let seletorPerfil = `<span class="badge bg-secondary">${escapeHTML((user.perfil || '').toUpperCase())}</span>`;
        if (payloadToken.perfil === 'admin') {
            seletorPerfil = `
                <select class="form-select form-select-sm" style="width: 125px;" onchange="alterarPerfil('${user.id}', this.value)" aria-label="Alterar Cargo">
                    <option value="candidato" ${user.perfil === 'candidato' ? 'selected' : ''}>Candidato</option>
                    <option value="profissional" ${user.perfil === 'profissional' ? 'selected' : ''}>Professor</option>
                    <option value="coordenador" ${user.perfil === 'coordenador' ? 'selected' : ''}>Coord.</option>
                    <option value="admin" ${user.perfil === 'admin' ? 'selected' : ''}>Admin</option>
                </select>
            `;
        }

        const btnBloqueio = payloadToken.perfil === 'admin'
            ? `<button class="btn btn-sm ${user.is_bloqueado ? 'btn-outline-success' : 'btn-outline-warning'} p-1 px-2" onclick="toggleBloqueio('${user.id}', ${user.is_bloqueado})" title="${user.is_bloqueado ? 'Desbloquear conta' : 'Bloquear conta'}">
                <i class="bi ${user.is_bloqueado ? 'bi-unlock-fill' : 'bi-lock-fill'}"></i>
               </button>` : '';

        const podeExcluir = payloadToken.perfil === 'admin' || (payloadToken.perfil === 'coordenador' && user.perfil === 'candidato');
        const btnExcluir = podeExcluir
            ? `<button class="btn btn-sm btn-outline-danger p-1 px-2" onclick="excluirUsuario('${user.id}', '${user.nome.replace(/'/g, "\\'")}')" title="Excluir conta">
                <i class="bi bi-trash-fill"></i>
               </button>` : '';

        const row = `
            <tr>
                <td>
                    <div class="fw-bold font-heading text-dark">${nomeFormatado}</div>
                    ${statusBadge}
                </td>
                <td>
                    <div class="small text-dark">${emailFormatado}</div>
                    <div class="text-muted small">${telFormatado}</div>
                </td>
                <td>${seletorPerfil}</td>
                <td><span class="text-secondary small fw-semibold">${cursosAtivosFormatado}</span></td>
                <td class="text-center fw-bold text-primary">${user.total_agendados || 0}</td>
                <td class="text-center fw-bold text-success">${user.total_concluidos || 0}</td>
                <td class="text-center fw-bold text-danger">${user.total_cancelados || 0}</td>
                <td class="text-end text-nowrap">
                    <div class="d-inline-flex gap-1">
                        ${btnZap}
                        ${btnBloqueio}
                        ${btnExcluir}
                    </div>
                </td>
            </tr>
        `;
        tbody.innerHTML += row;
    });
}

function aplicarFiltrosUsuarios(){
    const termo = (document.getElementById('filtroTextoUser')?.value || '').toLowerCase();
    const perfil = document.getElementById('filtroPerfilUser')?.value || '';

    const listaFiltrada = baseUtilizadores.filter(user => {
        const matchTexto = (user.nome || '').toLowerCase().includes(termo) || (user.email || '').toLowerCase().includes(termo);
        const matchPerfil = perfil === "" || user.perfil === perfil;
        return matchTexto && matchPerfil;
    });

    renderizarTabelaUtilizadores(listaFiltrada);
}

const inputBusca = document.getElementById('filtroTextoUser');
const selectPerfil = document.getElementById('filtroPerfilUser');
const btnLimpar = document.getElementById('btnLimparFiltros');

if(inputBusca) inputBusca.addEventListener('input', aplicarFiltrosUsuarios);
if(selectPerfil) selectPerfil.addEventListener('change', aplicarFiltrosUsuarios);
if(btnLimpar) {
    btnLimpar.addEventListener('click', () => {
        if (inputBusca) inputBusca.value = '';
        if (selectPerfil) selectPerfil.value = '';
        renderizarTabelaUtilizadores(baseUtilizadores);
    });
}

async function alterarPerfil(idUsuario, novoPerfil){
    if (!confirm(`Deseja alterar o perfil deste utilizador para ${novoPerfil.toUpperCase()}?`)) {
        carregarUtilizadores();
        return;
    }

    try {
        const response = await fetch(`${API_URL}/admin/usuarios/${idUsuario}/perfil`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
            body: JSON.stringify({ perfil: novoPerfil })
        });

        if (response.ok) {
            carregarUtilizadores();
        } else {
            const data = await response.json();
            alert(data.erro || 'Erro ao alterar perfil.');
            carregarUtilizadores();
        }
    } catch (error) {
        alert("Erro ao alterar o perfil.");
        carregarUtilizadores();
    }
}

async function toggleBloqueio(id, statusAtual){
    const acao = statusAtual ? 'desbloquear' : 'bloquear';
    if (!confirm(`Tem a certeza que deseja ${acao} este utilizador?`)) return;

    try {
        const response = await fetch(`${API_URL}/admin/usuarios/${id}/bloquear`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({ is_bloqueado: !statusAtual })
        });

        if (response.ok) {
            carregarUtilizadores();
            carregarMetricas();
        } else {
            const err = await response.json();
            alert(err.erro || 'Erro ao alterar status.');
        }
    } catch (error) {
        alert("Erro de ligação.");
    }
}

// ============================================================================
// 3. CRIAR NOVO COLABORADOR (APENAS ADMIN)
// ============================================================================
const formColaborador = document.getElementById('formColaborador');
if(formColaborador) {
    formColaborador.addEventListener('submit', async (e) => {
        e.preventDefault();
        const msgDiv = document.getElementById('msgColab');
        msgDiv.innerHTML = '<span class="text-primary small"><span class="spinner-border spinner-border-sm me-1"></span> A registar colaborador...</span>';

        const payload = {
            nome: document.getElementById('colabNome').value,
            email: document.getElementById('colabEmail').value,
            telefone: document.getElementById('colabTelefone').value,
            senha: document.getElementById('colabSenha').value,
            perfil: document.getElementById('colabPerfil').value
        };

        try {
            const response = await fetch(`${API_URL}/admin/colaboradores`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify(payload)
            });

            const data = await response.json();

            if (response.ok) {
                msgDiv.innerHTML = `<div class="alert alert-success py-2 small mb-0"><i class="bi bi-check2-circle me-1"></i> ${data.mensagem}</div>`;
                formColaborador.reset();
                carregarUtilizadores();
            } else {
                msgDiv.innerHTML = `<div class="alert alert-danger py-2 small mb-0"><i class="bi bi-exclamation-triangle-fill me-1"></i> ${data.erro}</div>`;
            }
        } catch (error) {
            msgDiv.innerHTML = '<div class="alert alert-danger py-2 small mb-0"><i class="bi bi-wifi-off me-1"></i> Erro de ligação com o servidor.</div>';
        }
    });
}

// ============================================================================
// 4. LÓGICA DE CADASTRO DE CURSO & VAGAS
// ============================================================================
const formCurso = document.getElementById('formCurso');
if (formCurso) {
    formCurso.addEventListener('submit', async (e) => {
        e.preventDefault();
        const msgDiv = document.getElementById('msgCurso');
        msgDiv.innerHTML = '<span class="text-primary small"><span class="spinner-border spinner-border-sm me-1"></span> A guardar curso...</span>';

        const payload = {
            nome: document.getElementById('nomeCurso').value,
            descricao: document.getElementById('descricaoCurso').value,
            motivo_modelo: document.getElementById('motivoCurso').value,
            restricoes: document.getElementById('restricoesCurso').value,
            foto_url: document.getElementById('fotoCurso').value,
            localizacao: document.getElementById('localCurso').value,
            profissional_id: document.getElementById('selectProfissional').value
        };

        try {
            const response = await fetch(`${API_URL}/cursos`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify(payload)
            });

            const data = await response.json();

            if (response.ok) {
                msgDiv.innerHTML = `<div class="alert alert-success py-2 small mb-0"><i class="bi bi-check2-circle me-1"></i> ${data.mensagem}</div>`;
                formCurso.reset();
                carregarCursosNoSelect();
                carregarCursosAdmin();
            } else {
                msgDiv.innerHTML = `<div class="alert alert-danger py-2 small mb-0"><i class="bi bi-exclamation-triangle-fill me-1"></i> ${data.erro}</div>`;
            }
        } catch (error) {
            msgDiv.innerHTML = '<div class="alert alert-danger py-2 small mb-0"><i class="bi bi-wifi-off me-1"></i> Erro de ligação.</div>';
        }
    });
}

async function carregarCursosNoSelect(){
    const select = document.getElementById('selectCurso');
    if (!select) return;

    try {
        const response = await fetch(`${API_URL}/cursos/ativos`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        const cursos = await response.json();

        select.innerHTML = '<option value="" disabled selected>Selecione o curso vinculado...</option>';
        if (Array.isArray(cursos)) {
            cursos.forEach(curso => {
                const option = document.createElement('option');
                option.value = curso.id;
                option.textContent = curso.nome;
                select.appendChild(option);
            });
        }
    } catch (error) {
        select.innerHTML = '<option value="" disabled>Erro ao carregar cursos</option>';
    }
}

const formVagas = document.getElementById('formVagas');
if (formVagas) {
    formVagas.addEventListener('submit', async (e) => {
        e.preventDefault();
        const msgDiv = document.getElementById('msgVaga');
        msgDiv.innerHTML = '<span class="text-primary small"><span class="spinner-border spinner-border-sm me-1"></span> A abrir vagas...</span>';

        const payload = {
            curso_id: document.getElementById('selectCurso').value,
            data_hora: document.getElementById('dataHora').value,
            vagas_totais: parseInt(document.getElementById('vagasTotais').value)
        };

        try {
            const response = await fetch(`${API_URL}/disponibilidades`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify(payload)
            });

            const data = await response.json();

            if (response.ok) {
                msgDiv.innerHTML = `<div class="alert alert-success py-2 small mb-0"><i class="bi bi-check2-circle me-1"></i> ${data.mensagem}</div>`;
                formVagas.reset();
                carregarMetricas();
                carregarPautasGlobais();
            } else {
                msgDiv.innerHTML = `<div class="alert alert-danger py-2 small mb-0"><i class="bi bi-exclamation-triangle-fill me-1"></i> ${data.erro}</div>`;
            }
        } catch (error) {
            msgDiv.innerHTML = '<div class="alert alert-danger py-2 small mb-0"><i class="bi bi-wifi-off me-1"></i> Erro de ligação.</div>';
        }
    });
}

async function carregarProfissionaisNoSelect(){
    const select = document.getElementById('selectProfissional');
    if (!select) return;

    try {
        const response = await fetch(`${API_URL}/admin/profissionais`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        const profissionais = await response.json();
        select.innerHTML = '<option value="" disabled selected>Selecione o professor responsável...</option>';
        if (Array.isArray(profissionais)) {
            profissionais.forEach(p => {
                const option = document.createElement('option');
                option.value = p.id;
                option.textContent = p.nome;
                select.appendChild(option);
            });
        }
    } catch (error) {
        select.innerHTML = '<option value="" disabled>Erro ao carregar professores</option>';
    }
}

async function excluirUsuario(id, nome){
    if (!confirm(`ATENÇÃO: Tem certeza absoluta que deseja remover a conta de ${nome}? Todos os seus agendamentos serão excluídos.`)) return;

    try {
        const response = await fetch(`${API_URL}/admin/usuarios/${id}`, {
            method: 'DELETE',
            headers: { 'Authorization': `Bearer ${token}` }
        });

        if (response.ok) {
            carregarUtilizadores();
            carregarMetricas();
        } else {
            const err = await response.json();
            alert(err.erro || 'Erro ao remover conta.');
        }
    } catch (error) {
        alert("Erro na conexão com o servidor.");
    }
}

// Modal de Edição
let modalEditarCursoInstance = null;

document.addEventListener("DOMContentLoaded", () => {
    const modalEl = document.getElementById('modalEditarCurso');
    if (modalEl) modalEditarCursoInstance = new bootstrap.Modal(modalEl);

    carregarCursosAdmin();
});

// ==========================================
// 5. LISTAR CURSOS NA TABELA DE GESTÃO
// ==========================================
async function carregarCursosAdmin(){
    const tbody = document.getElementById('tabelaCursosBody');
    if (!tbody) return;

    try {
        const response = await fetch(`${API_URL}/cursos/admin`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        const cursos = await response.json();

        tbody.innerHTML = '';
        window.cursosAdminMap.clear();
        if (!Array.isArray(cursos) || cursos.length === 0) {
            tbody.innerHTML = '<tr><td colspan="5" class="text-center text-muted py-4"><i class="bi bi-inbox me-1"></i> Nenhum curso cadastrado no sistema.</td></tr>';
            return;
        }

        cursos.forEach(curso => {
            window.cursosAdminMap.set(String(curso.id), curso);
            const profNome = escapeHTML(curso.usuarios ? curso.usuarios.nome : 'Sem Docente');
            const cursoNome = escapeHTML(curso.nome);
            const cursoDescricao = escapeHTML(curso.descricao || '');
            const localizacao = escapeHTML(curso.localizacao || '-');

            const statusBadge = curso.status === 'ativo'
                ? '<span class="badge-custom badge-status-ativo"><i class="bi bi-check2-circle"></i> Ativo</span>'
                : '<span class="badge-custom badge-status-arquivado"><i class="bi bi-archive"></i> Arquivado</span>';

            const btnArquivar = curso.status === 'ativo'
                ? `<button class="btn btn-sm btn-outline-danger p-1 px-2" onclick="arquivarCurso('${curso.id}', '${curso.nome.replace(/'/g, "\\'")}')" title="Arquivar curso"><i class="bi bi-archive"></i> Arquivar</button>`
                : '';

            const row = `
                <tr>
                    <td>
                        <div class="fw-bold font-heading text-dark">${cursoNome}</div>
                        <div class="small text-muted text-truncate" style="max-width: 280px;">${cursoDescricao}</div>
                    </td>
                    <td><span class="small fw-semibold text-secondary">${profNome}</span></td>
                    <td><span class="small text-muted"><i class="bi bi-geo-alt me-1"></i>${localizacao}</span></td>
                    <td>${statusBadge}</td>
                    <td class="text-end">
                        <div class="d-inline-flex gap-1">
                            <button class="btn btn-sm btn-outline-brand p-1 px-2" onclick="abrirModalEdicao('${curso.id}')" title="Editar curso">
                                <i class="bi bi-pencil-square"></i> Editar
                            </button>
                            ${btnArquivar}
                        </div>
                    </td>
                </tr>
            `;
            tbody.innerHTML += row;
        });
    } catch (error) {
        tbody.innerHTML = '<tr><td colspan="5" class="text-danger text-center py-4"><i class="bi bi-wifi-off me-2"></i>Erro ao carregar catálogo de cursos.</td></tr>';
    }
}

async function arquivarCurso(id, nome){
    if(!confirm(`Deseja arquivar o curso "${nome}"? Ele sairá da vitrine dos alunos, mas o histórico será mantido.`)) return;

    try {
        const response = await fetch(`${API_URL}/cursos/${id}`, {
            method: 'DELETE',
            headers: { 'Authorization': `Bearer ${token}` }
        });

        if (response.ok) {
            carregarCursosAdmin();
            carregarCursosNoSelect();
        } else {
            alert('Erro ao arquivar curso.');
        }
    } catch (error) {
        alert('Erro de conexão.');
    }
}

function abrirModalEdicao(cursoParam){
    if (!modalEditarCursoInstance) return;

    const curso = typeof cursoParam === 'object' ? cursoParam : window.cursosAdminMap.get(String(cursoParam));
    if (!curso) return;

    document.getElementById('editCursoId').value = curso.id;
    document.getElementById('editNome').value = curso.nome;
    document.getElementById('editDescricao').value = curso.descricao;
    document.getElementById('editLocal').value = curso.localizacao;
    document.getElementById('editFoto').value = curso.foto_url || '';

    const selectPrincipal = document.getElementById('selectProfissional');
    const selectEdit = document.getElementById('editProfissional');
    if (selectPrincipal && selectEdit) {
        selectEdit.innerHTML = selectPrincipal.innerHTML;
        selectEdit.value = curso.profissional_id;
    }

    document.getElementById('msgEditCurso').innerHTML = '';
    modalEditarCursoInstance.show();
}

const formEditarCurso = document.getElementById('formEditarCurso');
if (formEditarCurso) {
    formEditarCurso.addEventListener('submit', async (e) => {
        e.preventDefault();
        const id = document.getElementById('editCursoId').value;
        const msgDiv = document.getElementById('msgEditCurso');
        msgDiv.innerHTML = '<span class="text-primary small"><span class="spinner-border spinner-border-sm me-1"></span> A atualizar...</span>';

        const payload = {
            nome: document.getElementById('editNome').value,
            descricao: document.getElementById('editDescricao').value,
            localizacao: document.getElementById('editLocal').value,
            foto_url: document.getElementById('editFoto').value,
            profissional_id: document.getElementById('editProfissional').value
        };

        try {
            const response = await fetch(`${API_URL}/cursos/${id}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify(payload)
            });

            if (response.ok) {
                msgDiv.innerHTML = '<div class="alert alert-success py-2 small mb-0"><i class="bi bi-check2-circle me-1"></i> Curso atualizado com sucesso!</div>';
                carregarCursosAdmin();
                carregarCursosNoSelect();
                setTimeout(() => modalEditarCursoInstance.hide(), 1200);
            } else {
                msgDiv.innerHTML = '<div class="alert alert-danger py-2 small mb-0">Erro ao atualizar curso.</div>';
            }
        } catch (error) {
            msgDiv.innerHTML = '<div class="alert alert-danger py-2 small mb-0"><i class="bi bi-wifi-off me-1"></i> Erro de conexão.</div>';
        }
    });
}

// ==========================================
// 6. PAUTAS GLOBAIS DE TURMAS & INSCRIÇÕES
// ==========================================
async function carregarPautasGlobais(){
    const accordion = document.getElementById('accordionPautasGlobais');
    if (!accordion) return;

    try {
        const response = await fetch(`${API_URL}/admin/pautas-globais`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });

        if (response.status === 401) {
            localStorage.removeItem('token');
            window.location.href = 'index.html';
            return;
        }

        const cursos = await response.json();
        accordion.innerHTML = '';

        if (!response.ok) {
            accordion.innerHTML = `<div class="alert alert-danger p-3"><i class="bi bi-exclamation-triangle-fill me-2"></i>${escapeHTML(cursos.erro || 'Erro ao carregar as pautas.')}</div>`;
            return;
        }

        if (!Array.isArray(cursos) || cursos.length === 0) {
            accordion.innerHTML = '<div class="empty-state-card py-4"><h6 class="empty-state-title">Nenhum curso ativo cadastrado no sistema.</h6></div>';
            return;
        }

        cursos.forEach((curso, index) => {
            const profNome = escapeHTML(curso.usuarios ? curso.usuarios.nome : 'Professor a definir');
            const cursoNome = escapeHTML(curso.nome);
            let disponibilidadesHTML = '';

            if (curso.disponibilidades && curso.disponibilidades.length > 0) {
                curso.disponibilidades.sort((a, b) => new Date(a.data_hora) - new Date(b.data_hora));

                curso.disponibilidades.forEach(disp => {
                    const dataFormatada = new Date(disp.data_hora).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' });
                    const agendamentos = disp.agendamentos || [];

                    let tabelaModelos = '';
                    if (agendamentos.length === 0) {
                        tabelaModelos = '<div class="text-center py-2 text-muted small bg-light rounded mt-2">Nenhum modelo inscrito para esta data ainda.</div>';
                    } else {
                        const linhas = agendamentos.map(ag => {
                            let badgeStatus = '';
                            if (ag.status === 'agendado') badgeStatus = '<span class="badge-custom badge-status-agendado">Agendado</span>';
                            else if (ag.status === 'concluido') badgeStatus = '<span class="badge-custom badge-status-concluido">Concluído</span>';
                            else badgeStatus = '<span class="badge-custom badge-status-cancelado">Cancelado</span>';

                            const nomeModelo = escapeHTML(ag.usuarios ? ag.usuarios.nome : 'Modelo');
                            const telLimpo = (ag.usuarios?.telefone || '').replace(/\D/g, '');
                            const msgZap = encodeURIComponent(`Olá, ${ag.usuarios?.nome || ''}! Aqui é a Coordenação do SENAC referente ao curso ${curso.nome}.`);
                            const btnZap = telLimpo
                                ? `<a href="https://wa.me/55${telLimpo}?text=${msgZap}" target="_blank" class="btn btn-sm btn-outline-success border-0 px-2 py-1" title="WhatsApp"><i class="bi bi-whatsapp"></i> ${escapeHTML(ag.usuarios.telefone)}</a>`
                                : '<span class="text-muted small">-</span>';

                            const btnCancelarAdmin = ag.status === 'agendado'
                                ? `<button class="btn btn-sm btn-outline-danger py-0 px-2" onclick="cancelarAgendamentoAdmin('${ag.id}', '${(ag.usuarios?.nome || '').replace(/'/g, "\\'")}')" title="Cancelar Inscrição (Admin)"><i class="bi bi-x-circle me-1"></i> Cancelar</button>`
                                : '';

                            return `
                                <tr>
                                    <td class="fw-semibold text-dark font-heading">${nomeModelo}</td>
                                    <td>${btnZap}</td>
                                    <td>${badgeStatus}</td>
                                    <td class="text-end">${btnCancelarAdmin}</td>
                                </tr>
                            `;
                        }).join('');

                        tabelaModelos = `
                            <div class="table-responsive mt-2">
                                <table class="table table-custom align-middle">
                                    <thead><tr><th>Modelo</th><th>Contato</th><th>Status</th><th class="text-end">Ações Admin</th></tr></thead>
                                    <tbody>${linhas}</tbody>
                                </table>
                            </div>
                        `;
                    }

                    const vagasOcupadas = disp.vagas_ocupadas;
                    const vagasTotais = disp.vagas_totais;

                    disponibilidadesHTML += `
                        <div class="mb-3 p-3 bg-white border rounded-3 shadow-sm">
                            <div class="d-flex justify-content-between align-items-center border-bottom pb-2">
                                <span class="fw-bold text-dark"><i class="bi bi-clock me-1 text-primary"></i> Data/Hora: ${dataFormatada}</span>
                                <span class="badge bg-secondary">Vagas: ${vagasOcupadas} / ${vagasTotais}</span>
                            </div>
                            ${tabelaModelos}
                        </div>
                    `;
                });
            } else {
                disponibilidadesHTML = '<div class="alert alert-light border text-muted small mb-0"><i class="bi bi-info-circle me-1"></i> Nenhum horário cadastrado para este curso.</div>';
            }

            const itemOpen = index === 0 ? 'show' : '';
            const btnCollapsed = index === 0 ? '' : 'collapsed';

            accordion.innerHTML += `
                <div class="accordion-item">
                    <h2 class="accordion-header">
                        <button class="accordion-button ${btnCollapsed}" type="button" data-bs-toggle="collapse" data-bs-target="#collapsePauta${curso.id}">
                            <div class="d-flex align-items-center gap-2">
                                <i class="bi bi-journal-album text-primary"></i>
                                <span><strong>${cursoNome}</strong> &nbsp;<span class="text-muted small fw-normal">(Docente: ${profNome})</span></span>
                            </div>
                        </button>
                    </h2>
                    <div id="collapsePauta${curso.id}" class="accordion-collapse collapse ${itemOpen}" data-bs-parent="#accordionPautasGlobais">
                        <div class="accordion-body">
                            ${disponibilidadesHTML}
                        </div>
                    </div>
                </div>
            `;
        });
    } catch (error) {
        accordion.innerHTML = '<div class="alert alert-danger p-3"><i class="bi bi-wifi-off me-2"></i>Erro ao carregar pautas globais.</div>';
    }
}

const pautasTab = document.getElementById('pautas-tab');
if (pautasTab) {
    pautasTab.addEventListener('click', carregarPautasGlobais);
}

// Inicializações
carregarProfissionaisNoSelect();
carregarMetricas();
carregarCursosNoSelect();
carregarUtilizadores();
carregarPautasGlobais();