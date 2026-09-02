function gerarLinkGoogleCalendar(cursoNome, dataHoraIso, localizacao) {
    if (!dataHoraIso) return '#';
    try {
        const inicio = new Date(dataHoraIso);
        const fim = new Date(inicio.getTime() + (2 * 60 * 60 * 1000));
        const formatarData = (d) => d.toISOString().replace(/-|:|\.\d\d\d/g, "");
        const params = new URLSearchParams({
            action: "TEMPLATE",
            text: `Atendimento SENAC: ${cursoNome}`,
            dates: `${formatarData(inicio)}/${formatarData(fim)}`,
            details: `Atendimento prático supervisionado como modelo voluntário no SENAC. Em caso de imprevistos, cancele na plataforma com 2 horas de antecedência.`,
            location: localizacao || "SENAC - Santo Antônio de Jesus, BA",
        });
        return `https://calendar.google.com/calendar/render?${params.toString()}`;
    } catch (e) {
        return '#';
    }
}

// frontend/js/painel.js

const isLocalDev = window.location.protocol === 'file:' || 
  ((window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') && window.location.port !== '3000');

const API_URL = isLocalDev ? 'http://localhost:3000/api' : `${window.location.origin}/api`;

const token = localStorage.getItem('token');
if (!token) window.location.href = 'index.html';

// Tratamento seguro de token inválido
let payloadTokenGlobal = null;
try {
    payloadTokenGlobal = JSON.parse(atob(token.split('.')[1]));
    if (!payloadTokenGlobal || !payloadTokenGlobal.id) throw new Error();
} catch (e) {
    localStorage.removeItem('token');
    window.location.href = 'login.html';
}

const btnSair = document.getElementById('btnSair');
const btnDrawerSair = document.getElementById('btnDrawerSair');

function logoutUsuario() {
    localStorage.removeItem('token');
    window.location.href = 'login.html';
}

if (btnSair) btnSair.addEventListener('click', logoutUsuario);
if (btnDrawerSair) btnDrawerSair.addEventListener('click', logoutUsuario);

if (payloadTokenGlobal && document.getElementById('drawerUserName')) {
    document.getElementById('drawerUserName').textContent = (payloadTokenGlobal.email || 'Modelo').split('@')[0];
}

// Helper de requisições autenticadas com auto-logout em 401
async function fetchAuth(url, options = {}) {
    options.headers = {
        ...(options.headers || {}),
        'Authorization': `Bearer ${token}`
    };
    const res = await fetch(url, options);
    if (res.status === 401) {
        localStorage.removeItem('token');
        window.location.href = 'index.html';
        throw new Error('Sessão expirada');
    }
    return res;
}

// Instâncias dos Modais do Bootstrap
const modalAgendamentoEl = document.getElementById('modalAgendamento');
const modalFeedbackEl = document.getElementById('modalFeedback');
const modalDetalhesCursoEl = document.getElementById('modalDetalhesCurso');
const modalConfirmacaoSucessoEl = document.getElementById('modalConfirmacaoSucesso');

const modalAgendamento = modalAgendamentoEl ? new bootstrap.Modal(modalAgendamentoEl) : null;
const modalFeedback = modalFeedbackEl ? new bootstrap.Modal(modalFeedbackEl) : null;
const modalDetalhesCurso = modalDetalhesCursoEl ? new bootstrap.Modal(modalDetalhesCursoEl) : null;
const modalConfirmacaoSucesso = modalConfirmacaoSucessoEl ? new bootstrap.Modal(modalConfirmacaoSucessoEl) : null;

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

// Mapa para armazenamento seguro de cursos em memória
window.cursosAtivosMap = new Map();
let baseCursos = [];
let categoriaSelecionada = 'todos';

// ==========================================
// 1. CARREGAR A VITRINE DE CURSOS
// ==========================================
async function carregarCursos(){
    const divCursos = document.getElementById('listaCursos');
    if (!divCursos) return;

    // Renderizar Skeletons de Carregamento
    divCursos.innerHTML = `
        <div class="col-md-6 col-lg-4">
            <div class="card-premium h-100 p-3">
                <div class="skeleton-box mb-3" style="height: 180px;"></div>
                <div class="skeleton-box mb-2" style="height: 24px; width: 70%;"></div>
                <div class="skeleton-box mb-2" style="height: 16px; width: 40%;"></div>
                <div class="skeleton-box mt-auto" style="height: 38px;"></div>
            </div>
        </div>
        <div class="col-md-6 col-lg-4">
            <div class="card-premium h-100 p-3">
                <div class="skeleton-box mb-3" style="height: 180px;"></div>
                <div class="skeleton-box mb-2" style="height: 24px; width: 65%;"></div>
                <div class="skeleton-box mb-2" style="height: 16px; width: 45%;"></div>
                <div class="skeleton-box mt-auto" style="height: 38px;"></div>
            </div>
        </div>
        <div class="col-md-6 col-lg-4">
            <div class="card-premium h-100 p-3">
                <div class="skeleton-box mb-3" style="height: 180px;"></div>
                <div class="skeleton-box mb-2" style="height: 24px; width: 80%;"></div>
                <div class="skeleton-box mb-2" style="height: 16px; width: 35%;"></div>
                <div class="skeleton-box mt-auto" style="height: 38px;"></div>
            </div>
        </div>
    `;

    try {
        const response = await fetchAuth(`${API_URL}/cursos/ativos`);
        baseCursos = await response.json();

        if (!Array.isArray(baseCursos)) baseCursos = [];
        renderizarVitrineCursos();

        const requestedCourseId = new URLSearchParams(window.location.search).get('curso');
        if (requestedCourseId && window.cursosAtivosMap.has(String(requestedCourseId))) {
            window.history.replaceState({}, '', `${window.location.pathname}#vitrine`);
            setTimeout(() => abrirModalDetalhesCurso(requestedCourseId), 250);
        }
    } catch (error) {
        divCursos.innerHTML = `
            <div class="col-12">
                <div class="alert alert-danger p-4 rounded-3 text-center">
                    <i class="bi bi-exclamation-triangle-fill fs-3 d-block mb-2"></i>
                    Erro ao carregar os cursos disponíveis. Por favor, tente novamente mais tarde.
                </div>
            </div>
        `;
    }
}

function renderizarVitrineCursos(){
    const divCursos = document.getElementById('listaCursos');
    if (!divCursos) return;

    divCursos.innerHTML = '';
    window.cursosAtivosMap.clear();

    const termoBusca = (document.getElementById('filtroTextoCurso')?.value || '').toLowerCase().trim();

    const cursosFiltrados = baseCursos.filter(curso => {
        const nomeMatch = (curso.nome || '').toLowerCase().includes(termoBusca);
        const descMatch = (curso.descricao || '').toLowerCase().includes(termoBusca);
        const profMatch = (curso.usuarios?.nome || '').toLowerCase().includes(termoBusca);
        const textMatch = !termoBusca || nomeMatch || descMatch || profMatch;

        let catMatch = true;
        if (categoriaSelecionada !== 'todos') {
            const textoCompleto = `${curso.nome} ${curso.descricao || ''}`.toLowerCase();
            if (categoriaSelecionada === 'cabelo') {
                catMatch = textoCompleto.includes('cabelo') || textoCompleto.includes('barba') || textoCompleto.includes('corte') || textoCompleto.includes('cabeleireiro');
            } else if (categoriaSelecionada === 'facial') {
                catMatch = textoCompleto.includes('facial') || textoCompleto.includes('pele') || textoCompleto.includes('limpeza') || textoCompleto.includes('maquiagem') || textoCompleto.includes('sobrancelha');
            } else if (categoriaSelecionada === 'massoterapia') {
                catMatch = textoCompleto.includes('mass') || textoCompleto.includes('relax') || textoCompleto.includes('drenagem');
            } else if (categoriaSelecionada === 'unhas') {
                catMatch = textoCompleto.includes('unha') || textoCompleto.includes('manicure') || textoCompleto.includes('pedicure') || textoCompleto.includes('nail');
            }
        }

        return textMatch && catMatch;
    });

    if (cursosFiltrados.length === 0) {
        divCursos.innerHTML = `
            <div class="col-12">
                <div class="empty-state-card">
                    <div class="empty-state-icon"><i class="bi bi-search"></i></div>
                    <h5 class="empty-state-title">Nenhum serviço encontrado</h5>
                    <p class="empty-state-desc">Tente ajustar o termo de pesquisa ou selecionar outra categoria para ver mais opções.</p>
                </div>
            </div>
        `;
        return;
    }

    cursosFiltrados.forEach(curso => {
        window.cursosAtivosMap.set(String(curso.id), curso);

        const profNome = escapeHTML(curso.usuarios ? curso.usuarios.nome : 'Docente Responsável');
        const local = escapeHTML(curso.localizacao || 'SENAC Santo Antônio');
        const imagem = escapeHTML(curso.foto_url || 'https://images.unsplash.com/photo-1560066984-138dadb4c035?w=800&auto=format&fit=crop&q=60');
        const nomeFormatado = escapeHTML(curso.nome);
        const descRaw = curso.descricao || 'Procedimento prático supervisionado.';
        const descResumo = escapeHTML(descRaw.length > 90 ? descRaw.substring(0, 90) + '...' : descRaw);
        const motivo = escapeHTML(curso.motivo_modelo || 'Prática supervisionada em ambiente de excelência.');

        const card = `
            <div class="col-md-6 col-lg-4">
                <div class="course-detail-card h-100" onclick="abrirModalDetalhesCurso('${curso.id}')" style="cursor: pointer;">
                    <div class="card-img-container position-relative" style="height: 140px; overflow: hidden;">
                        <img src="${imagem}" alt="${nomeFormatado}" style="width: 100%; height: 100%; object-fit: cover;" onerror="this.src='https://images.unsplash.com/photo-1560066984-138dadb4c035?w=800&auto=format&fit=crop&q=60'">
                        <span class="course-badge position-absolute top-0 start-0 m-2"><i class="bi bi-stars me-1"></i> Vagas Abertas</span>
                    </div>
                    <div class="p-3 d-flex flex-column flex-grow-1">
                        <h5 class="fw-bold mb-1 text-dark font-heading" style="font-size: 1.05rem;">${nomeFormatado}</h5>
                        <div class="d-flex align-items-center gap-2 text-muted small mb-2" style="font-size: 0.8rem;">
                            <span><i class="bi bi-geo-alt-fill text-danger me-1"></i> ${local}</span>
                            <span>•</span>
                            <span><i class="bi bi-person-badge-fill text-primary me-1"></i> ${profNome}</span>
                        </div>
                        <p class="card-text mb-3 text-secondary" style="font-size: 0.84rem; line-height: 1.4; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden;">${descResumo}</p>

                        <div class="pt-2 border-top mt-auto d-flex align-items-center justify-content-between">
                            <span class="badge bg-light text-primary border"><i class="bi bi-clock me-1"></i> 1h a 2h</span>
                            <button class="btn btn-orange btn-sm px-3 fw-bold" onclick="event.stopPropagation(); abrirModalDetalhesCurso('${curso.id}');">
                                Ver Detalhes <i class="bi bi-arrow-right ms-1"></i>
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        `;
        divCursos.innerHTML += card;
    });
}

// Configurar ouvintes de pesquisa e filtros
document.addEventListener('DOMContentLoaded', () => {
    const inputBuscaCurso = document.getElementById('filtroTextoCurso');
    if (inputBuscaCurso) {
        inputBuscaCurso.addEventListener('input', renderizarVitrineCursos);
    }

    const containerCategorias = document.getElementById('containerCategorias');
    if (containerCategorias) {
        containerCategorias.addEventListener('click', (e) => {
            const btn = e.target.closest('.btn-category-pill');
            if (!btn) return;

            containerCategorias.querySelectorAll('.btn-category-pill').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            categoriaSelecionada = btn.getAttribute('data-categoria') || 'todos';
            renderizarVitrineCursos();
        });
    }
});

// ==========================================
// 1.5 MODAL DE DETALHES DO CURSO
// ==========================================
function abrirModalDetalhesCurso(cursoParam){
    if (!modalDetalhesCurso) return;

    const curso = typeof cursoParam === 'object' ? cursoParam : window.cursosAtivosMap.get(String(cursoParam));
    if (!curso) return;

    document.getElementById('detalheCursoNome').textContent = curso.nome;
    document.getElementById('detalheCursoProf').textContent = curso.usuarios ? curso.usuarios.nome : 'Docente a definir';
    document.getElementById('detalheCursoLocal').textContent = curso.localizacao || 'SENAC';
    document.getElementById('detalheCursoDescricao').textContent = curso.descricao;

    const imgEl = document.getElementById('detalheCursoImagem');
    imgEl.src = curso.foto_url || 'https://images.unsplash.com/photo-1560066984-138dadb4c035?w=800&auto=format&fit=crop&q=60';
    imgEl.onerror = () => { imgEl.src = 'https://images.unsplash.com/photo-1560066984-138dadb4c035?w=800&auto=format&fit=crop&q=60'; };

    const blocoMotivo = document.getElementById('blocoMotivo');
    if (curso.motivo_modelo && curso.motivo_modelo.trim() !== '') {
        if (blocoMotivo) blocoMotivo.style.display = 'block';
        const elMotivo = document.getElementById('detalheCursoMotivo');
        if (elMotivo) elMotivo.textContent = curso.motivo_modelo;
    } else if (blocoMotivo) {
        blocoMotivo.style.display = 'none';
    }

    const blocoRestricoes = document.getElementById('blocoRestricoes');
    if (curso.restricoes && curso.restricoes.trim() !== '') {
        blocoRestricoes.style.display = 'block';
        document.getElementById('detalheCursoRestricoes').textContent = curso.restricoes;
    } else {
        blocoRestricoes.style.display = 'none';
    }

    const btnHorarios = document.getElementById('btnIrParaHorarios');
    btnHorarios.onclick = () => {
        modalDetalhesCurso.hide();
        setTimeout(() => {
            abrirModalAgendamento(curso.id, curso.nome, curso.descricao);
        }, 400);
    };

    const divAvaliacoes = document.getElementById('detalheCursoAvaliacoes');
    divAvaliacoes.innerHTML = '<div class="text-center text-muted small py-3"><div class="spinner-border spinner-border-sm me-1 text-primary"></div> Carregando avaliações...</div>';

    fetchAuth(`${API_URL}/feedbacks/curso/${curso.id}`)
        .then(res => res.json())
        .then(feedbacks => {
            if (!Array.isArray(feedbacks) || feedbacks.length === 0) {
                divAvaliacoes.innerHTML = '<div class="text-muted small text-center py-3">Este curso ainda não possui avaliações. Participe e seja o primeiro a avaliar!</div>';
                return;
            }

            const media = (feedbacks.reduce((acc, curr) => acc + curr.nota, 0) / feedbacks.length).toFixed(1);

            let html = `
                <div class="d-flex align-items-center gap-2 mb-3 bg-light p-2 rounded border">
                    <span class="badge bg-warning text-dark fs-6"><i class="bi bi-star-fill me-1"></i> ${media} / 5.0</span>
                    <span class="small text-muted fw-semibold">(${feedbacks.length} avaliações registradas)</span>
                </div>
            `;

            feedbacks.forEach(f => {
                const estrelas = '⭐'.repeat(f.nota);
                const dataFormatada = new Date(f.created_at).toLocaleDateString('pt-BR');
                const nomeAvaliador = escapeHTML(f.avaliador_nome || 'Modelo Anônimo');
                const comentarioTexto = f.comentario ? `"${escapeHTML(f.comentario)}"` : '<span class="text-muted fst-italic">Avaliação sem comentário adicional.</span>';

                html += `
                    <div class="bg-light p-3 rounded mb-2 border-start border-warning border-4">
                        <div class="d-flex justify-content-between align-items-center mb-1">
                            <strong class="small text-dark font-heading">${nomeAvaliador}</strong>
                            <span class="small text-muted">${dataFormatada}</span>
                        </div>
                        <div class="mb-1 text-warning small">${estrelas}</div>
                        <div class="small text-secondary">${comentarioTexto}</div>
                    </div>
                `;
            });
            divAvaliacoes.innerHTML = html;
        }).catch(() => {
            divAvaliacoes.innerHTML = '<div class="text-muted small text-center py-2">Não foi possível carregar as avaliações deste serviço.</div>';
        });

    const dialog = modalDetalhesCursoEl.querySelector('.modal-dialog');
    if (dialog) dialog.style.transform = '';
    if (typeof window.makeModalDraggable === 'function') {
        window.makeModalDraggable(modalDetalhesCursoEl);
    }

    modalDetalhesCurso.show();
}

// ==========================================
// 2. FLUXO DE AGENDAMENTO (MODAL E HORÁRIOS)
// ==========================================
window.currentSchedulingData = {
    cursoNome: '',
    dataHoraFormatada: '',
    localizacao: 'SENAC - Santo Antônio de Jesus, BA'
};

async function abrirModalAgendamento(cursoId, cursoNome, cursoDescricao){
    if (!modalAgendamento) return;

    window.currentSchedulingData.cursoNome = cursoNome;
    const cursoObj = window.cursosAtivosMap.get(String(cursoId));
    if (cursoObj && cursoObj.localizacao) {
        window.currentSchedulingData.localizacao = cursoObj.localizacao;
    }

    document.getElementById('modalCursoNome').textContent = cursoNome;
    document.getElementById('modalCursoDescricao').textContent = cursoDescricao;
    document.getElementById('msgAgendamento').innerHTML = '';

    const select = document.getElementById('selectHorarios');
    const grade = document.getElementById('gradeHorarios');
    const resumo = document.getElementById('resumoHorario');
    select.innerHTML = '<option value="" disabled selected>Selecione um horário</option>';
    grade.className = 'schedule-chip-grid';
    grade.innerHTML = '<div class="col-12 text-center text-muted py-4"><span class="spinner-border spinner-border-sm me-1 text-primary"></span> Buscando os melhores horários...</div>';
    resumo.classList.add('d-none');
    resumo.innerHTML = '';

    const btnConfirmar = document.getElementById('btnConfirmarAgendamento');
    btnConfirmar.disabled = true;
    btnConfirmar.onclick = () => realizarAgendamento(select.value);

    modalAgendamento.show();

    try {
        const response = await fetchAuth(`${API_URL}/disponibilidades/curso/${cursoId}`);
        const horarios = await response.json();

        select.innerHTML = '<option value="" disabled selected>Selecione o melhor dia e horário</option>';

        if (!Array.isArray(horarios) || horarios.length === 0) {
            grade.innerHTML = '<div class="col-12 text-center text-muted py-4"><i class="bi bi-calendar2-x fs-2 d-block mb-2 text-warning"></i><strong>Nenhum horário cadastrado</strong><p class="small text-muted mb-0">Novas vagas podem aparecer em breve.</p></div>';
            btnConfirmar.disabled = true;
            return;
        }

        const horariosLivres = horarios.filter(h => (h.vagas_totais - h.vagas_ocupadas) > 0);
        grade.innerHTML = '';

        if (horariosLivres.length === 0) {
            grade.innerHTML = '<div class="col-12 text-center text-muted py-4"><i class="bi bi-people fs-2 d-block mb-2 text-danger"></i><strong>Todas as vagas foram preenchidas</strong><p class="small text-muted mb-0">Escolha outro serviço ou consulte novamente mais tarde.</p></div>';
            btnConfirmar.disabled = true;
            return;
        }

        horariosLivres.forEach((h, index) => {
            const data = new Date(h.data_hora);
            const diaSemana = data.toLocaleDateString('pt-BR', { weekday: 'short' }).replace('.', '').toUpperCase();
            const diaMes = data.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
            const hora = data.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
            const dataCompleta = data.toLocaleDateString('pt-BR', { weekday: 'long', day: '2-digit', month: 'long' });
            const vagasLivres = h.vagas_totais - h.vagas_ocupadas;

            select.innerHTML += `<option value="${h.id}">${dataCompleta}, ${hora}</option>`;

            const chip = document.createElement('div');
            chip.className = 'schedule-chip';
            chip.setAttribute('role', 'radio');
            chip.setAttribute('aria-checked', 'false');

            let badgeStatus = '';
            if (vagasLivres === 1) {
                badgeStatus = '<span class="badge bg-warning bg-opacity-10 text-dark border border-warning border-opacity-25 chip-status"><i class="bi bi-fire text-danger"></i> Última vaga</span>';
            } else if (vagasLivres === 2) {
                badgeStatus = '<span class="badge bg-warning bg-opacity-10 text-dark border border-warning border-opacity-25 chip-status">Últimas 2 vagas</span>';
            } else {
                badgeStatus = `<span class="badge bg-success bg-opacity-10 text-success border border-success border-opacity-25 chip-status"><i class="bi bi-circle-fill me-1" style="font-size: 0.45rem;"></i> ${vagasLivres} vagas</span>`;
            }

            chip.innerHTML = `
                <div class="small fw-bold text-muted mb-1">${diaSemana} • ${diaMes}</div>
                <span class="chip-time">${hora}</span>
                <div class="mt-2">${badgeStatus}</div>
            `;

            chip.addEventListener('click', () => {
                grade.querySelectorAll('.schedule-chip').forEach(item => {
                    item.classList.remove('is-selected');
                    item.setAttribute('aria-checked', 'false');
                });
                chip.classList.add('is-selected');
                chip.setAttribute('aria-checked', 'true');
                select.value = h.id;
                btnConfirmar.disabled = false;
                window.currentSchedulingData.dataHoraFormatada = `${dataCompleta} às ${hora}`;
                resumo.innerHTML = `<i class="bi bi-check2-circle text-success me-1"></i><span><small class="text-muted d-block">Horário selecionado:</small><strong class="text-dark">${dataCompleta}, às ${hora}</strong></span>`;
                resumo.classList.remove('d-none');
            });
            grade.appendChild(chip);
        });

    } catch (error) {
        grade.innerHTML = '<div class="col-12 text-center text-danger py-4"><i class="bi bi-wifi-off fs-2 d-block mb-2"></i>Não foi possível carregar os horários.</div>';
    }
}

async function realizarAgendamento(disponibilidadeId){
    const msgDiv = document.getElementById('msgAgendamento');
    const btnConfirmar = document.getElementById('btnConfirmarAgendamento');
    const originalBtn = btnConfirmar.innerHTML;

    if (!disponibilidadeId) {
        msgDiv.innerHTML = '<div class="alert alert-warning py-2 small mb-0"><i class="bi bi-exclamation-triangle-fill me-1"></i> Por favor, selecione um horário na lista.</div>';
        return;
    }

    msgDiv.innerHTML = '<div class="text-primary py-2"><span class="spinner-border spinner-border-sm me-1"></span> Confirmando seu agendamento...</div>';
    btnConfirmar.disabled = true;

    try {
        const response = await fetchAuth(`${API_URL}/agendamentos`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ 
                disponibilidade_id: disponibilidadeId,
                restricoes_candidato: document.getElementById('inputRestricoesAgendamento') ? document.getElementById('inputRestricoesAgendamento').value.trim() : ''
            })
        });

        const data = await response.json();

        if (response.ok) {
            msgDiv.innerHTML = `<div class="alert alert-success py-2 small mb-0"><i class="bi bi-check-circle-fill me-1"></i> Inscrição confirmada com sucesso!</div>`;
            carregarMeusAgendamentos();
            
            setTimeout(() => {
                if (modalAgendamento) modalAgendamento.hide();
                btnConfirmar.disabled = false;
                btnConfirmar.innerHTML = originalBtn;

                // Abrir Modal Flutuante de Confirmação com Google Maps
                if (modalConfirmacaoSucesso) {
                    const confCurso = document.getElementById('confCursoNome');
                    const confData = document.getElementById('confDataHora');
                    const confLoc = document.getElementById('confLocalizacao');

                    if (confCurso) confCurso.textContent = window.currentSchedulingData.cursoNome;
                    if (confData) confData.textContent = window.currentSchedulingData.dataHoraFormatada || 'Data e horário agendados';
                    if (confLoc) confLoc.textContent = window.currentSchedulingData.localizacao || 'SENAC - Santo Antônio de Jesus, BA';

                    modalConfirmacaoSucesso.show();
                }
            }, 600);
        } else {
            msgDiv.innerHTML = `<div class="alert alert-danger py-2 small mb-0"><i class="bi bi-x-circle-fill me-1"></i> ${data.erro}</div>`;
            btnConfirmar.disabled = false;
            btnConfirmar.innerHTML = originalBtn;
        }
    } catch (error) {
        msgDiv.innerHTML = '<div class="alert alert-danger py-2 small mb-0"><i class="bi bi-wifi-off me-1"></i> Erro de conexão com o servidor.</div>';
        btnConfirmar.disabled = false;
        btnConfirmar.innerHTML = originalBtn;
    }
}

// ==========================================
// 3. CARREGAR E CANCELAR OS MEUS AGENDAMENTOS (REGRA DE 1 HORA DE EXPIRAÇÃO)
// ==========================================
const PRAZO_EXPIRACAO_MS = 60 * 60 * 1000; // 1 hora de tolerância visual após cancelar ou concluir
const STORAGE_FINALIZADOS = 'connect_senac_agendamentos_finalizados';

function obterFinalizados() {
    try {
        return JSON.parse(localStorage.getItem(STORAGE_FINALIZADOS) || '{}');
    } catch (e) {
        return {};
    }
}

function salvarTimestampFinalizado(id, status, timestamp = Date.now()) {
    try {
        const finalizados = obterFinalizados();
        finalizados[id] = {
            timestamp: timestamp,
            status: status
        };
        localStorage.setItem(STORAGE_FINALIZADOS, JSON.stringify(finalizados));
    } catch (e) {}
}

async function ocultarAgendamentoAgora(agendamentoId) {
    salvarTimestampFinalizado(agendamentoId, 'oculto', Date.now() - (PRAZO_EXPIRACAO_MS + 5000));
    try {
        await fetchAuth(`${API_URL}/agendamentos/${agendamentoId}`, {
            method: 'DELETE'
        }).catch(() => {});
    } catch (e) {}
    carregarMeusAgendamentos();
}
window.ocultarAgendamentoAgora = ocultarAgendamentoAgora;

function exibirEstadoVazioAgendamentos(container) {
    container.innerHTML = `
        <div class="col-12">
            <div class="empty-state-card py-4">
                <div class="empty-state-icon" style="width: 50px; height: 50px; font-size: 1.4rem;"><i class="bi bi-calendar-x"></i></div>
                <h6 class="empty-state-title mb-1">Sem agendamentos ativos</h6>
                <p class="empty-state-desc small mb-0">Você não possui nenhum horário marcado. Escolha um dos cursos abaixo para agendar a sua participação!</p>
            </div>
        </div>
    `;
}

async function carregarMeusAgendamentos(){
    const divAgendamentos = document.getElementById('listaMeusAgendamentos');
    if (!divAgendamentos) return;

    try {
        const response = await fetchAuth(`${API_URL}/agendamentos/meus`);
        const agendamentos = await response.json();

        divAgendamentos.innerHTML = '';
        if (!Array.isArray(agendamentos) || agendamentos.length === 0) {
            exibirEstadoVazioAgendamentos(divAgendamentos);
            return;
        }

        const agora = Date.now();
        const finalizados = obterFinalizados();
        let itensExibidos = 0;

        agendamentos.forEach(ag => {
            // Regra de 1 Hora: Cancelado ou Concluído sai de 'Meus Agendamentos' após 1 hora
            if (ag.status === 'cancelado' || ag.status === 'concluido') {
                let info = finalizados[ag.id];

                if (!info) {
                    // Se for concluído com horário no passado há mais de 1h, não exibe
                    if (ag.status === 'concluido' && ag.disponibilidades?.data_hora) {
                        const dataCursoMs = new Date(ag.disponibilidades.data_hora).getTime();
                        if (agora - dataCursoMs >= PRAZO_EXPIRACAO_MS) {
                            return;
                        }
                        info = { timestamp: dataCursoMs, status: ag.status };
                    } else {
                        info = { timestamp: agora, status: ag.status };
                    }
                    salvarTimestampFinalizado(ag.id, ag.status, info.timestamp);
                }

                const decorridoMs = agora - info.timestamp;
                if (decorridoMs >= PRAZO_EXPIRACAO_MS) {
                    // Ultrapassou o prazo de 1 hora: exclui da visão
                    fetchAuth(`${API_URL}/agendamentos/${ag.id}`, { method: 'DELETE' }).catch(() => {});
                    return;
                }

                ag._minutosRestantes = Math.max(1, Math.ceil((PRAZO_EXPIRACAO_MS - decorridoMs) / 60000));
            }

            itensExibidos++;

            const rawCursoNome = ag.disponibilidades && ag.disponibilidades.cursos ? ag.disponibilidades.cursos.nome : 'Curso Senac';
            const cursoNome = escapeHTML(rawCursoNome);
            const dataHora = ag.disponibilidades && ag.disponibilidades.data_hora ? new Date(ag.disponibilidades.data_hora).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' }) : '-';
            let badge = '';
            let acoesHTML = '';
            let avisoExpiracaoHTML = '';

            const isPassado = ag.disponibilidades && ag.disponibilidades.data_hora && new Date(ag.disponibilidades.data_hora) < new Date();

            if (ag.status === 'agendado') {
                if (isPassado) {
                    badge = '<span class="badge-custom badge-status-past"><i class="bi bi-clock-history"></i> Realizado / Passado</span>';
                    acoesHTML = `<button class="btn btn-sm btn-outline-secondary w-100 mt-2" onclick="abrirModalFeedback('${ag.id}')"><i class="bi bi-star me-1"></i> Avaliar Atendimento</button>`;
                } else {
                    const localCurso = ag.disponibilidades && ag.disponibilidades.cursos ? ag.disponibilidades.cursos.localizacao : 'SENAC';
                    const linkCalendar = gerarLinkGoogleCalendar(cursoNome, ag.disponibilidades.data_hora, localCurso);
                    badge = '<span class="badge-custom badge-status-agendado"><i class="bi bi-check2-circle"></i> Confirmado</span>';
                    acoesHTML = `
                        <a href="${linkCalendar}" target="_blank" rel="noopener noreferrer" class="btn btn-sm btn-outline-primary w-100 mt-2">
                            <i class="bi bi-calendar-plus me-1"></i> Adicionar ao Google Agenda
                        </a>
                        <button class="btn btn-sm btn-outline-danger w-100 mt-2" onclick="cancelarAgendamento('${ag.id}')">
                            <i class="bi bi-x-circle me-1"></i> Cancelar Inscrição
                        </button>
                    `;
                }
            } else if (ag.status === 'cancelado') {
                badge = '<span class="badge-custom badge-status-cancelado"><i class="bi bi-slash-circle"></i> Cancelado</span>';
                avisoExpiracaoHTML = `
                    <div class="small text-muted mt-2 d-flex justify-content-between align-items-center" style="font-size: 0.76rem;">
                        <span><i class="bi bi-clock-history text-warning me-1"></i> Sai da lista em ${ag._minutosRestantes} min</span>
                        <button class="btn btn-link p-0 text-danger text-decoration-none" style="font-size: 0.76rem;" onclick="ocultarAgendamentoAgora('${ag.id}')" title="Ocultar agora">
                            <i class="bi bi-x-circle me-1"></i> Ocultar
                        </button>
                    </div>
                `;
            } else if (ag.status === 'concluido') {
                badge = '<span class="badge-custom badge-status-concluido"><i class="bi bi-patch-check-fill"></i> Concluído</span>';
                acoesHTML = `<button class="btn btn-sm btn-orange w-100 mt-2" onclick="abrirModalFeedback('${ag.id}')"><i class="bi bi-star-fill me-1"></i> Avaliar Atendimento</button>`;
                avisoExpiracaoHTML = `
                    <div class="small text-muted mt-2 d-flex justify-content-between align-items-center" style="font-size: 0.76rem;">
                        <span><i class="bi bi-clock-history text-warning me-1"></i> Sai da lista em ${ag._minutosRestantes} min</span>
                        <button class="btn btn-link p-0 text-secondary text-decoration-none" style="font-size: 0.76rem;" onclick="ocultarAgendamentoAgora('${ag.id}')" title="Ocultar agora">
                            <i class="bi bi-x-circle me-1"></i> Ocultar
                        </button>
                    </div>
                `;
            }

            const card = `
                <div class="col-12 col-md-6 col-xl-4" id="card-agendamento-${ag.id}">
                    <div class="card-premium h-100 p-3">
                        <div class="d-flex justify-content-between align-items-start mb-2 gap-2">
                            <h6 class="fw-bold text-dark mb-0 font-heading text-truncate">${cursoNome}</h6>
                            ${badge}
                        </div>
                        <div class="text-secondary small mb-3">
                            <i class="bi bi-calendar-event text-primary me-1"></i> <strong>${dataHora}</strong>
                        </div>
                        <div class="mt-auto">
                            ${acoesHTML}
                            ${avisoExpiracaoHTML}
                            <div id="msg-canc-${ag.id}" class="small text-center mt-2"></div>
                        </div>
                    </div>
                </div>
            `;
            divAgendamentos.innerHTML += card;
        });

        if (itensExibidos === 0) {
            exibirEstadoVazioAgendamentos(divAgendamentos);
        }
    } catch (error) {
        divAgendamentos.innerHTML = `
            <div class="col-12">
                <div class="alert alert-danger py-3 text-center small rounded-3">
                    <i class="bi bi-exclamation-triangle-fill me-1"></i> Erro ao carregar seus agendamentos.
                </div>
            </div>
        `;
    }
}

async function cancelarAgendamento(agendamentoId){
    if (!confirm("Tem certeza de que deseja cancelar sua inscrição neste horário? A vaga será liberada para outro modelo.")) return;

    const msgDiv = document.getElementById(`msg-canc-${agendamentoId}`);
    if (msgDiv) msgDiv.innerHTML = '<span class="text-muted small"><span class="spinner-border spinner-border-sm me-1"></span> Cancelando...</span>';

    try {
        const response = await fetchAuth(`${API_URL}/agendamentos/${agendamentoId}/cancelar`, {
            method: 'PUT'
        });

        const data = await response.json();

        if (response.ok) {
            salvarTimestampFinalizado(agendamentoId, 'cancelado', Date.now());
            carregarMeusAgendamentos();
        } else {
            if (msgDiv) msgDiv.innerHTML = `<span class="text-danger fw-bold small"><i class="bi bi-exclamation-circle-fill me-1"></i> ${escapeHTML(data.erro)}</span>`;
        }
    } catch (error) {
        if (msgDiv) msgDiv.innerHTML = '<span class="text-danger small">Erro ao processar cancelamento.</span>';
    }
}

// Timer automático para atualizar e remover agendamentos expirados a cada 60 segundos
if (!window._timerExpiracaoAgendamentos) {
    window._timerExpiracaoAgendamentos = setInterval(() => {
        const divAg = document.getElementById('listaMeusAgendamentos');
        if (divAg && document.visibilityState === 'visible') {
            carregarMeusAgendamentos();
        }
    }, 60000);
}


// ==========================================
// 4. MÓDULO DE FEEDBACK & AVALIAÇÕES
// ==========================================
function abrirModalFeedback(agendamentoId){
    if (!modalFeedback) return;
    document.getElementById('feedbackAgendamentoId').value = agendamentoId;
    document.getElementById('feedbackNota').value = '5';
    document.getElementById('feedbackComentario').value = '';
    document.getElementById('msgFeedback').innerHTML = '';
    modalFeedback.show();
}

const formFeedback = document.getElementById('formFeedback');
if (formFeedback) {
    formFeedback.addEventListener('submit', async (e) => {
        e.preventDefault();
        const msgDiv = document.getElementById('msgFeedback');
        const btnSubmit = document.getElementById('btnEnviarFeedback');
        const originalBtn = btnSubmit ? btnSubmit.innerHTML : "Enviar Avaliação";

        msgDiv.innerHTML = '<span class="text-primary small"><span class="spinner-border spinner-border-sm me-1"></span> A registrar sua avaliação...</span>';
        if (btnSubmit) btnSubmit.disabled = true;

        const payload = {
            agendamento_id: document.getElementById('feedbackAgendamentoId').value,
            nota: parseInt(document.getElementById('feedbackNota').value),
            comentario: document.getElementById('feedbackComentario').value
        };

        try {
            const response = await fetchAuth(`${API_URL}/feedbacks`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });

            const data = await response.json();

            if (response.ok) {
                msgDiv.innerHTML = `<div class="alert alert-success py-2 small mb-0"><i class="bi bi-check2-circle me-1"></i> ${escapeHTML(data.mensagem)}</div>`;
                setTimeout(() => {
                    modalFeedback.hide();
                    if (btnSubmit) {
                        btnSubmit.disabled = false;
                        btnSubmit.innerHTML = originalBtn;
                    }
                    carregarMeusFeedbacks();
                    carregarMeusAgendamentos();
                }, 1400);
            } else {
                msgDiv.innerHTML = `<div class="alert alert-danger py-2 small mb-0"><i class="bi bi-exclamation-circle-fill me-1"></i> ${escapeHTML(data.erro)}</div>`;
                if (btnSubmit) {
                    btnSubmit.disabled = false;
                    btnSubmit.innerHTML = originalBtn;
                }
            }
        } catch (error) {
            msgDiv.innerHTML = '<div class="alert alert-danger py-2 small mb-0"><i class="bi bi-wifi-off me-1"></i> Erro de conexão com o servidor.</div>';
            if (btnSubmit) {
                btnSubmit.disabled = false;
                btnSubmit.innerHTML = originalBtn;
            }
        }
    });
}

// ==========================================
// 5. HISTÓRICO PESSOAL DE AVALIAÇÕES
// ==========================================
async function carregarMeusFeedbacks(){
    const divFeedbacks = document.getElementById('listaMeusFeedbacks');
    if (!divFeedbacks) return;

    try {
        const response = await fetchAuth(`${API_URL}/feedbacks/meus`);
        const feedbacks = await response.json();

        divFeedbacks.innerHTML = '';
        if (!Array.isArray(feedbacks) || feedbacks.length === 0) {
            divFeedbacks.innerHTML = `
                <div class="col-12">
                    <div class="empty-state-card py-4">
                        <div class="empty-state-icon" style="width: 50px; height: 50px; font-size: 1.4rem;"><i class="bi bi-star"></i></div>
                        <h6 class="empty-state-title mb-1">Nenhuma avaliação realizada</h6>
                        <p class="empty-state-desc small mb-0">Após a realização de um atendimento concluído, sua avaliação aparecerá registrada aqui.</p>
                    </div>
                </div>
            `;
            return;
        }

        feedbacks.forEach(f => {
            const estrelas = '⭐'.repeat(f.nota);
            const dataFormatada = new Date(f.created_at).toLocaleDateString('pt-BR');
            const cursoNome = escapeHTML(f.curso_nome || 'Curso SENAC');
            const comentarioTexto = f.comentario ? `"${escapeHTML(f.comentario)}"` : '<span class="text-muted fst-italic">Avaliação registrada sem comentário escrito.</span>';

            const card = `
                <div class="col-12 col-md-6 col-lg-4">
                    <div class="card-premium h-100 p-4">
                        <div class="d-flex justify-content-between align-items-center mb-2 gap-2">
                            <span class="fw-bold text-dark text-truncate font-heading">${cursoNome}</span>
                            <span class="badge bg-light text-secondary border small">${dataFormatada}</span>
                        </div>
                        <div class="mb-3 fs-6 text-warning">${estrelas} <span class="badge bg-warning bg-opacity-10 text-dark ms-1">${f.nota}.0</span></div>
                        <p class="text-secondary small mb-0 bg-light p-3 rounded-3 border-start border-warning border-3">${comentarioTexto}</p>
                    </div>
                </div>
            `;
            divFeedbacks.innerHTML += card;
        });
    } catch (error) {
        divFeedbacks.innerHTML = '<div class="col-12"><div class="alert alert-danger py-2 small text-center">Erro ao carregar o histórico de avaliações.</div></div>';
    }
}

// Navegação de Retorno para Colaboradores / Professores
document.addEventListener('DOMContentLoaded', () => {
    if (token) {
        try {
            const payloadToken = JSON.parse(atob(token.split('.')[1]));
            const navbar = document.querySelector('.navbar-nav');
            const drawerBackoffice = document.getElementById('drawerBackofficeLinks');

            if (payloadToken.perfil === 'admin' || payloadToken.perfil === 'coordenador') {
                const urlBackoffice = payloadToken.perfil === 'coordenador' ? 'coordenador.html' : 'admin.html';
                if (navbar) navbar.innerHTML += `<li class="nav-item"><a class="nav-link text-warning fw-bold" href="${urlBackoffice}"><i class="bi bi-speedometer2 me-1"></i> Voltar ao Backoffice</a></li>`;
                if (drawerBackoffice) drawerBackoffice.innerHTML = `<a class="drawer-link text-warning fw-bold" href="${urlBackoffice}"><i class="bi bi-speedometer2 text-warning"></i> Voltar ao Backoffice</a>`;
            } else if (payloadToken.perfil === 'profissional') {
                if (navbar) navbar.innerHTML += `<li class="nav-item"><a class="nav-link text-warning fw-bold" href="profissional.html"><i class="bi bi-journal-check me-1"></i> Voltar à Pauta Docente</a></li>`;
                if (drawerBackoffice) drawerBackoffice.innerHTML = `<a class="drawer-link text-warning fw-bold" href="profissional.html"><i class="bi bi-journal-check text-warning"></i> Voltar à Pauta Docente</a>`;
            }
        } catch(e) {}
    }
});

// Inicialização
carregarMeusFeedbacks();
carregarCursos().then(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const autoCursoId = urlParams.get('curso');
    if (autoCursoId) {
        setTimeout(() => {
            abrirModalDetalhesCurso(autoCursoId);
        }, 300);
    }
});
carregarMeusAgendamentos();
