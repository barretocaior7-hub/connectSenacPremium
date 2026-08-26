// frontend/js/painel.js

const isLocalDev = window.location.protocol === 'file:' || 
  ((window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') && window.location.port !== '3000');

const API_URL = isLocalDev ? 'http://localhost:3000/api' : `${window.location.origin}/api`;

const token = localStorage.getItem('token');
if (!token) window.location.href = 'index.html';

// Tratamento seguro de token inválido
try {
    const payload = JSON.parse(atob(token.split('.')[1]));
    if (!payload || !payload.id) throw new Error();
} catch (e) {
    localStorage.removeItem('token');
    window.location.href = 'index.html';
}

const btnSair = document.getElementById('btnSair');
if (btnSair) {
    btnSair.addEventListener('click', () => {
        localStorage.removeItem('token');
        window.location.href = 'index.html';
    });
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

const modalAgendamento = modalAgendamentoEl ? new bootstrap.Modal(modalAgendamentoEl) : null;
const modalFeedback = modalFeedbackEl ? new bootstrap.Modal(modalFeedbackEl) : null;
const modalDetalhesCurso = modalDetalhesCursoEl ? new bootstrap.Modal(modalDetalhesCursoEl) : null;

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
        const local = escapeHTML(curso.localizacao || 'SENAC');
        const imagem = escapeHTML(curso.foto_url || 'https://images.unsplash.com/photo-1560066984-138dadb4c035?w=800&auto=format&fit=crop&q=60');
        const nomeFormatado = escapeHTML(curso.nome);
        const descRaw = curso.descricao || 'Procedimento prático supervisionado.';
        const descResumo = escapeHTML(descRaw.length > 90 ? descRaw.substring(0, 90) + '...' : descRaw);

        const card = `
            <div class="col-md-6 col-lg-4">
                <div class="card-premium card-course-interactive" onclick="abrirModalDetalhesCurso('${curso.id}')">
                    <div class="card-img-container">
                        <img src="${imagem}" alt="${nomeFormatado}" onerror="this.src='https://images.unsplash.com/photo-1560066984-138dadb4c035?w=800&auto=format&fit=crop&q=60'">
                        <span class="course-badge"><i class="bi bi-tag-fill me-1"></i> Curso SENAC</span>
                    </div>
                    <div class="card-body p-4 d-flex flex-column">
                        <h5 class="fw-bold mb-2 text-dark font-heading">${nomeFormatado}</h5>
                        <div class="d-flex align-items-center text-muted small mb-3">
                            <i class="bi bi-geo-alt-fill text-danger me-1"></i>
                            <span class="text-truncate">${local}</span>
                        </div>
                        <p class="card-text small text-secondary flex-grow-1 mb-3">${descResumo}</p>
                        <div class="pt-3 border-top d-flex align-items-center justify-content-between">
                            <span class="small text-muted"><i class="bi bi-person-check me-1"></i> Prof. ${profNome}</span>
                            <button class="btn btn-outline-brand btn-sm px-3">
                                Detalhes <i class="bi bi-arrow-right ms-1"></i>
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
    divAvaliacoes.innerHTML = '<div class="text-center text-muted small py-3"><div class="spinner-border spinner-border-sm me-1 text-primary"></div> A carregar avaliações...</div>';

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

    modalDetalhesCurso.show();
}

// ==========================================
// 2. FLUXO DE AGENDAMENTO (MODAL E HORÁRIOS)
// ==========================================
async function abrirModalAgendamento(cursoId, cursoNome, cursoDescricao){
    if (!modalAgendamento) return;

    document.getElementById('modalCursoNome').textContent = cursoNome;
    document.getElementById('modalCursoDescricao').textContent = cursoDescricao;
    document.getElementById('msgAgendamento').innerHTML = '';

    const select = document.getElementById('selectHorarios');
    const grade = document.getElementById('gradeHorarios');
    const resumo = document.getElementById('resumoHorario');
    select.innerHTML = '<option value="" disabled selected>Selecione um horário</option>';
    grade.innerHTML = '<div class="schedule-loading"><span class="spinner-border spinner-border-sm"></span> Buscando os melhores horários...</div>';
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
            grade.innerHTML = '<div class="schedule-empty"><i class="bi bi-calendar2-x"></i><strong>Nenhum horário disponível</strong><span>Novas vagas podem aparecer em breve. Volte para conferir.</span></div>';
            btnConfirmar.disabled = true;
            return;
        }

        const horariosLivres = horarios.filter(h => (h.vagas_totais - h.vagas_ocupadas) > 0);
        grade.innerHTML = '';
        horariosLivres.forEach((h, index) => {
            const data = new Date(h.data_hora);
            const diaSemana = data.toLocaleDateString('pt-BR', { weekday: 'short' }).replace('.', '');
            const dia = data.toLocaleDateString('pt-BR', { day: '2-digit' });
            const mes = data.toLocaleDateString('pt-BR', { month: 'short' }).replace('.', '');
            const hora = data.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
            const dataCompleta = data.toLocaleDateString('pt-BR', { weekday: 'long', day: '2-digit', month: 'long' });
            const vagasLivres = h.vagas_totais - h.vagas_ocupadas;
            select.innerHTML += `<option value="${h.id}">${dataCompleta}, ${hora}</option>`;
            const botao = document.createElement('button');
            botao.type = 'button';
            botao.className = 'schedule-option';
            botao.setAttribute('role', 'radio');
            botao.setAttribute('aria-checked', 'false');
            botao.style.setProperty('--item-delay', `${index * 45}ms`);
            botao.innerHTML = `<span class="schedule-date"><small>${diaSemana}</small><strong>${dia}</strong><small>${mes}</small></span><span class="schedule-time"><i class="bi bi-clock"></i><strong>${hora}</strong><small>Atendimento presencial</small></span><span class="schedule-spots ${vagasLivres <= 2 ? 'is-low' : ''}"><strong>${vagasLivres}</strong><small>vaga${vagasLivres > 1 ? 's' : ''}</small></span><i class="bi bi-check-circle-fill schedule-check"></i>`;
            botao.addEventListener('click', () => {
                grade.querySelectorAll('.schedule-option').forEach(item => { item.classList.remove('selected'); item.setAttribute('aria-checked', 'false'); });
                botao.classList.add('selected');
                botao.setAttribute('aria-checked', 'true');
                select.value = h.id;
                btnConfirmar.disabled = false;
                resumo.innerHTML = `<i class="bi bi-check2-circle"></i><span><small>Horário selecionado</small><strong>${dataCompleta}, às ${hora}</strong></span>`;
                resumo.classList.remove('d-none');
            });
            grade.appendChild(botao);
        });

        if (horariosLivres.length === 0) {
            grade.innerHTML = '<div class="schedule-empty"><i class="bi bi-people"></i><strong>Todas as vagas foram preenchidas</strong><span>Escolha outro serviço ou consulte novamente mais tarde.</span></div>';
            btnConfirmar.disabled = true;
        }
    } catch (error) {
        grade.innerHTML = '<div class="schedule-empty is-error"><i class="bi bi-wifi-off"></i><strong>Não foi possível carregar</strong><span>Verifique sua conexão e tente novamente.</span></div>';
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

    msgDiv.innerHTML = '<div class="text-primary py-2"><span class="spinner-border spinner-border-sm me-1"></span> Confirmando o seu agendamento...</div>';
    btnConfirmar.disabled = true;

    try {
        const response = await fetchAuth(`${API_URL}/agendamentos`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ disponibilidade_id: disponibilidadeId })
        });

        const data = await response.json();

        if (response.ok) {
            msgDiv.innerHTML = `<div class="alert alert-success py-2 small mb-0"><i class="bi bi-check-circle-fill me-1"></i> Inscrição confirmada com sucesso!</div>`;
            carregarMeusAgendamentos();
            setTimeout(() => {
                modalAgendamento.hide();
                btnConfirmar.disabled = false;
                btnConfirmar.innerHTML = originalBtn;
            }, 1400);
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
// 3. CARREGAR E CANCELAR OS MEUS AGENDAMENTOS
// ==========================================
async function carregarMeusAgendamentos(){
    const divAgendamentos = document.getElementById('listaMeusAgendamentos');
    if (!divAgendamentos) return;

    try {
        const response = await fetchAuth(`${API_URL}/agendamentos/meus`);
        const agendamentos = await response.json();

        divAgendamentos.innerHTML = '';
        if (!Array.isArray(agendamentos) || agendamentos.length === 0) {
            divAgendamentos.innerHTML = `
                <div class="col-12">
                    <div class="empty-state-card py-4">
                        <div class="empty-state-icon" style="width: 50px; height: 50px; font-size: 1.4rem;"><i class="bi bi-calendar-x"></i></div>
                        <h6 class="empty-state-title mb-1">Sem agendamentos ativos</h6>
                        <p class="empty-state-desc small mb-0">Você não possui nenhum horário marcado. Escolha um dos cursos abaixo para agendar a sua participação!</p>
                    </div>
                </div>
            `;
            return;
        }

        agendamentos.forEach(ag => {
            const rawCursoNome = ag.disponibilidades && ag.disponibilidades.cursos ? ag.disponibilidades.cursos.nome : 'Curso Senac';
            const cursoNome = escapeHTML(rawCursoNome);
            const dataHora = ag.disponibilidades && ag.disponibilidades.data_hora ? new Date(ag.disponibilidades.data_hora).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' }) : '-';
            let badge = '';
            let acoesHTML = '';

            if (ag.status === 'agendado') {
                badge = '<span class="badge-custom badge-status-agendado"><i class="bi bi-check2-circle"></i> Confirmado</span>';
                acoesHTML = `<button class="btn btn-sm btn-outline-danger w-100 mt-2" onclick="cancelarAgendamento('${ag.id}')"><i class="bi bi-x-circle me-1"></i> Cancelar Inscrição</button>`;
            } else if (ag.status === 'cancelado') {
                badge = '<span class="badge-custom badge-status-cancelado"><i class="bi bi-slash-circle"></i> Cancelado</span>';
            } else if (ag.status === 'concluido') {
                badge = '<span class="badge-custom badge-status-concluido"><i class="bi bi-patch-check-fill"></i> Concluído</span>';
                acoesHTML = `<button class="btn btn-sm btn-orange w-100 mt-2" onclick="abrirModalFeedback('${ag.id}')"><i class="bi bi-star-fill me-1"></i> Avaliar Atendimento</button>`;
            }

            const card = `
                <div class="col-12 col-md-6 col-xl-4">
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
                            <div id="msg-canc-${ag.id}" class="small text-center mt-2"></div>
                        </div>
                    </div>
                </div>
            `;
            divAgendamentos.innerHTML += card;
        });
    } catch (error) {
        divAgendamentos.innerHTML = `
            <div class="col-12">
                <div class="alert alert-danger py-3 text-center small rounded-3">
                    <i class="bi bi-exclamation-triangle-fill me-1"></i> Erro ao carregar os seus agendamentos.
                </div>
            </div>
        `;
    }
}

async function cancelarAgendamento(agendamentoId){
    if (!confirm("Tem certeza de que deseja cancelar a sua inscrição neste horário? A vaga será liberada para outro modelo.")) return;

    const msgDiv = document.getElementById(`msg-canc-${agendamentoId}`);
    if (msgDiv) msgDiv.innerHTML = '<span class="text-muted small"><span class="spinner-border spinner-border-sm me-1"></span> Cancelando...</span>';

    try {
        const response = await fetchAuth(`${API_URL}/agendamentos/${agendamentoId}/cancelar`, {
            method: 'PUT'
        });

        const data = await response.json();

        if (response.ok) {
            carregarMeusAgendamentos();
        } else {
            if (msgDiv) msgDiv.innerHTML = `<span class="text-danger fw-bold small"><i class="bi bi-exclamation-circle-fill me-1"></i> ${escapeHTML(data.erro)}</span>`;
        }
    } catch (error) {
        if (msgDiv) msgDiv.innerHTML = '<span class="text-danger small">Erro ao processar cancelamento.</span>';
    }
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

        msgDiv.innerHTML = '<span class="text-primary small"><span class="spinner-border spinner-border-sm me-1"></span> A registrar a sua avaliação...</span>';
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

            if (navbar) {
                if (payloadToken.perfil === 'admin' || payloadToken.perfil === 'coordenador') {
                    navbar.innerHTML += `<li class="nav-item"><a class="nav-link text-warning fw-bold" href="admin.html"><i class="bi bi-speedometer2 me-1"></i> Voltar ao Backoffice</a></li>`;
                } else if (payloadToken.perfil === 'profissional') {
                    navbar.innerHTML += `<li class="nav-item"><a class="nav-link text-warning fw-bold" href="profissional.html"><i class="bi bi-journal-check me-1"></i> Voltar à Pauta Docente</a></li>`;
                }
            }
        } catch(e) {}
    }
});

// Inicialização
carregarMeusFeedbacks();
carregarCursos();
carregarMeusAgendamentos();
