// js/coordenador.js
// Logica exclusiva da pagina da Coordenacao — Connect Senac

// ============================================================================
// SETUP: API, TOKEN e AUTENTICACAO
// ============================================================================
const isLocalDev =
  window.location.protocol === "file:" ||
  ((window.location.hostname === "localhost" ||
    window.location.hostname === "127.0.0.1") &&
    window.location.port !== "3000");

const API_URL = isLocalDev
  ? "http://localhost:3000/api"
  : `${window.location.origin}/api`;

const token = localStorage.getItem("token");
if (!token) window.location.href = "index.html";

// Decodificar JWT para verificar o perfil do usuário
let payloadToken = null;
try {
  payloadToken = JSON.parse(atob(token.split(".")[1]));
  if (!payloadToken || !payloadToken.id) throw new Error();
} catch (e) {
  localStorage.removeItem("token");
  window.location.href = "index.html";
}

// Validar que apenas coordenadores acessam esta pagina
if (
  payloadToken.perfil !== "coordenador" &&
  payloadToken.perfil !== "admin"
) {
  window.location.href = "index.html";
}

// Preencher nome no subheader e drawer
const elNome = document.getElementById("userNome");
if (elNome) elNome.textContent = (payloadToken.email || "").split("@")[0];

const drawerCoordName = document.getElementById("drawerCoordName");
if (drawerCoordName) drawerCoordName.textContent = (payloadToken.email || "Coordenador").split("@")[0];

function logoutCoordenador() {
  localStorage.removeItem("token");
  window.location.href = "login.html";
}

// Botoes Sair
const btnSair = document.getElementById("btnSair");
const btnCoordDrawerSair = document.getElementById("btnCoordDrawerSair");
if (btnSair) btnSair.addEventListener("click", logoutCoordenador);
if (btnCoordDrawerSair) btnCoordDrawerSair.addEventListener("click", logoutCoordenador);

// Ativação de abas via Drawer Mobile
function ativarTabCoordMobile(tabBtnId) {
  const triggerEl = document.getElementById(tabBtnId);
  if (triggerEl) {
    const tab = new bootstrap.Tab(triggerEl);
    tab.show();
  }
}
window.ativarTabCoordMobile = ativarTabCoordMobile;

// ============================================================================
// UTILITARIO: Sanitizar HTML (anti-XSS)
// ============================================================================
function escapeHTML(str) {
  if (str === null || str === undefined) return "";
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

// ============================================================================
// 1. METRICAS DO DASHBOARD (KPI CARDS)
// ============================================================================
async function carregarMetricas() {
  try {
    const response = await fetch(`${API_URL}/dashboard/metricas`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (response.ok) {
      const data = await response.json();
      const el = (id) => document.getElementById(id);
      if (el("metricUsuarios")) el("metricUsuarios").textContent = data.totalModelos !== undefined ? data.totalModelos : data.totalUsuarios;
      if (el("metricAgendados")) el("metricAgendados").textContent = data.agendamentos.agendados;
      if (el("metricConcluidos")) el("metricConcluidos").textContent = data.agendamentos.concluidos;
      if (el("metricCancelamento")) el("metricCancelamento").textContent = data.taxaCancelamento;
    }
  } catch (error) {
    console.error("Erro ao carregar metricas do dashboard.");
  }
}

// ============================================================================
// 2. CARREGAR PROFESSORES NO SELECT (Cadastro de Curso)
// ============================================================================
async function carregarProfissionaisNoSelect() {
  const select = document.getElementById("selectProfissional");
  if (!select) return;
  try {
    const response = await fetch(`${API_URL}/admin/profissionais`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    const profissionais = await response.json();
    select.innerHTML =
      '<option value="" disabled selected>Selecione o professor responsavel...</option>';
    if (Array.isArray(profissionais)) {
      profissionais.forEach((p) => {
        const option = document.createElement("option");
        option.value = p.id;
        option.textContent = p.nome;
        select.appendChild(option);
      });
    }
  } catch (error) {
    select.innerHTML =
      '<option value="" disabled>Erro ao carregar professores</option>';
  }
}

// ============================================================================
// 3. CARREGAR CURSOS NOS SELECTS
// ============================================================================
async function carregarCursosNoSelect() {
  const select = document.getElementById("selectCurso");
  if (!select) return;
  try {
    const response = await fetch(`${API_URL}/cursos/ativos`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    const cursos = await response.json();
    select.innerHTML =
      '<option value="" disabled selected>Selecione o curso vinculado...</option>';
    if (Array.isArray(cursos)) {
      cursos.forEach((curso) => {
        const option = document.createElement("option");
        option.value = curso.id;
        option.textContent = curso.nome;
        select.appendChild(option);
      });
    }
  } catch (error) {
    select.innerHTML =
      '<option value="" disabled>Erro ao carregar cursos</option>';
  }
}

// ============================================================================
// COMPONENTE: DRAG & DROP / SELEÇÃO DE IMAGEM DO DISPOSITIVO COM OTIMIZAÇÃO
// ============================================================================
function setupImageDropzone(dropzoneId, fileInputId, inputUrlId, previewContainerId, previewImgId, btnRemoveId) {
  const dropzone = document.getElementById(dropzoneId);
  const fileInput = document.getElementById(fileInputId);
  const inputUrl = document.getElementById(inputUrlId);
  const previewContainer = document.getElementById(previewContainerId);
  const previewImg = document.getElementById(previewImgId);
  const btnRemove = document.getElementById(btnRemoveId);

  if (!dropzone || !fileInput || !inputUrl) return { updatePreview: () => {}, clear: () => {} };

  function processImageFile(file) {
    if (!file || !file.type.startsWith('image/')) {
      alert('Por favor, selecione um arquivo de imagem válido (PNG, JPG, JPEG, WEBP).');
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');

        let width = img.width;
        let height = img.height;
        const maxDim = 1200;

        if (width > maxDim || height > maxDim) {
          if (width > height) {
            height = Math.round((height * maxDim) / width);
            width = maxDim;
          } else {
            width = Math.round((width * maxDim) / height);
            height = maxDim;
          }
        }

        canvas.width = width;
        canvas.height = height;
        ctx.drawImage(img, 0, 0, width, height);

        const optimizedDataUrl = canvas.toDataURL('image/jpeg', 0.85);
        inputUrl.value = optimizedDataUrl;
        updatePreview(optimizedDataUrl);
      };
      img.src = event.target.result;
    };
    reader.readAsDataURL(file);
  }

  function updatePreview(url) {
    if (url && url.trim() !== '') {
      previewImg.src = url;
      previewContainer.classList.remove('d-none');
      dropzone.classList.add('d-none');
    } else {
      previewImg.src = '';
      previewContainer.classList.add('d-none');
      dropzone.classList.remove('d-none');
    }
  }

  function clear() {
    inputUrl.value = '';
    if (fileInput) fileInput.value = '';
    updatePreview('');
  }

  ['dragenter', 'dragover'].forEach(eventName => {
    dropzone.addEventListener(eventName, (e) => {
      e.preventDefault();
      e.stopPropagation();
      dropzone.classList.add('dragover');
    }, false);
  });

  ['dragleave', 'drop'].forEach(eventName => {
    dropzone.addEventListener(eventName, (e) => {
      e.preventDefault();
      e.stopPropagation();
      dropzone.classList.remove('dragover');
    }, false);
  });

  dropzone.addEventListener('drop', (e) => {
    const dt = e.dataTransfer;
    const files = dt.files;
    if (files && files.length > 0) {
      processImageFile(files[0]);
    }
  });

  if (fileInput) {
    fileInput.addEventListener('change', () => {
      if (fileInput.files && fileInput.files.length > 0) {
        processImageFile(fileInput.files[0]);
      }
    });
  }

  inputUrl.addEventListener('input', () => {
    updatePreview(inputUrl.value.trim());
  });

  if (btnRemove) {
    btnRemove.addEventListener('click', (e) => {
      e.stopPropagation();
      clear();
    });
  }

  return { updatePreview, clear };
}

const dropzoneCursoHandler = setupImageDropzone(
  'dropzoneCurso',
  'fileInputCurso',
  'fotoCurso',
  'previewContainerCurso',
  'previewImgCurso',
  'btnRemoverFotoCurso'
);

const dropzoneEditCursoHandler = setupImageDropzone(
  'dropzoneEditCurso',
  'fileInputEditCurso',
  'editFoto',
  'previewContainerEditCurso',
  'previewImgEditCurso',
  'btnRemoverFotoEditCurso'
);

// ============================================================================
// 4. FORMULARIO: CADASTRAR NOVO CURSO
// ============================================================================
const formCurso = document.getElementById("formCurso");
if (formCurso) {
  formCurso.addEventListener("submit", async (e) => {
    e.preventDefault();
    const msgDiv = document.getElementById("msgCurso");
    msgDiv.innerHTML =
      '<span class="text-primary small"><span class="spinner-border spinner-border-sm me-1"></span> Salvando curso...</span>';

    const payload = {
      nome: document.getElementById("nomeCurso").value,
      descricao: document.getElementById("descricaoCurso").value,
      motivo_modelo: document.getElementById("motivoCurso").value,
      restricoes: document.getElementById("restricoesCurso").value,
      foto_url: document.getElementById("fotoCurso").value,
      localizacao: document.getElementById("localCurso").value,
      profissional_id: document.getElementById("selectProfissional").value,
    };

    try {
      const response = await fetch(`${API_URL}/cursos`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      });
      const data = await response.json();
      if (response.ok) {
        msgDiv.innerHTML = `<div class="alert alert-success py-2 small mb-0"><i class="bi bi-check2-circle me-1"></i> ${data.mensagem}</div>`;
        formCurso.reset();
        dropzoneCursoHandler.clear();
        carregarCursosNoSelect();
        carregarCursosAdmin();
      } else {
        msgDiv.innerHTML = `<div class="alert alert-danger py-2 small mb-0"><i class="bi bi-exclamation-triangle-fill me-1"></i> ${data.erro}</div>`;
      }
    } catch (error) {
      msgDiv.innerHTML =
        '<div class="alert alert-danger py-2 small mb-0"><i class="bi bi-wifi-off me-1"></i> Erro de ligacao.</div>';
    }
  });
}

// ============================================================================
// 5. FORMULARIO: ABRIR VAGAS
// ============================================================================
const formVagas = document.getElementById("formVagas");
if (formVagas) {
  formVagas.addEventListener("submit", async (e) => {
    e.preventDefault();
    const msgDiv = document.getElementById("msgVaga");
    msgDiv.innerHTML =
      '<span class="text-primary small"><span class="spinner-border spinner-border-sm me-1"></span> A abrir vagas...</span>';

    const payload = {
      curso_id: document.getElementById("selectCurso").value,
      data_hora: document.getElementById("dataHora").value,
      vagas_totais: parseInt(document.getElementById("vagasTotais").value),
    };

    try {
      const response = await fetch(`${API_URL}/disponibilidades`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
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
      msgDiv.innerHTML =
        '<div class="alert alert-danger py-2 small mb-0"><i class="bi bi-wifi-off me-1"></i> Erro de ligacao.</div>';
    }
  });
}

// ============================================================================
// 6. CATALOGO DE CURSOS (TABELA COM EDICAO)
// ============================================================================
window.cursosAdminMap = new Map();

async function carregarCursosAdmin() {
  const tbody = document.getElementById("tabelaCursosBody");
  if (!tbody) return;

  try {
    const response = await fetch(`${API_URL}/cursos/admin`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    const cursos = await response.json();

    tbody.innerHTML = "";
    window.cursosAdminMap.clear();

    if (!Array.isArray(cursos) || cursos.length === 0) {
      tbody.innerHTML =
        '<tr><td colspan="5" class="text-center text-muted py-4"><i class="bi bi-inbox me-1"></i> Nenhum curso cadastrado no sistema.</td></tr>';
      return;
    }

    cursos.forEach((curso) => {
      window.cursosAdminMap.set(String(curso.id), curso);
      const profNome = escapeHTML(
        curso.usuarios ? curso.usuarios.nome : "Sem Docente"
      );
      const cursoNome = escapeHTML(curso.nome);
      const cursoDescricao = escapeHTML(curso.descricao || "");
      const localizacao = escapeHTML(curso.localizacao || "-");

      const statusBadge =
        curso.status === "ativo"
          ? '<span class="badge-custom badge-status-ativo"><i class="bi bi-check2-circle"></i> Ativo</span>'
          : '<span class="badge-custom badge-status-arquivado"><i class="bi bi-archive"></i> Arquivado</span>';

      const btnArquivar =
        curso.status === "ativo"
          ? `<button class="btn btn-sm btn-outline-warning p-1 px-2" onclick="arquivarCurso('${curso.id}', '${curso.nome.replace(/'/g, "\\'")}')" title="Arquivar curso"><i class="bi bi-archive"></i> Arquivar</button>`
          : `<button class="btn btn-sm btn-outline-success p-1 px-2" onclick="desarquivarCurso('${curso.id}', '${curso.nome.replace(/'/g, "\\'")}')" title="Reativar curso"><i class="bi bi-arrow-counterclockwise"></i> Reativar</button>`;

      const btnExcluir = `<button class="btn btn-sm btn-outline-danger p-1 px-2" onclick="excluirCurso('${curso.id}', '${curso.nome.replace(/'/g, "\\'")}')" title="Excluir curso"><i class="bi bi-trash3"></i> Excluir</button>`;

      tbody.innerHTML += `
        <tr>
          <td>
            <div class="fw-bold font-heading text-dark">${cursoNome}</div>
            <div class="small text-muted text-truncate" style="max-width:280px">${cursoDescricao}</div>
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
              ${btnExcluir}
            </div>
          </td>
        </tr>`;
    });
  } catch (error) {
    tbody.innerHTML =
      '<tr><td colspan="5" class="text-danger text-center py-4"><i class="bi bi-wifi-off me-2"></i>Erro ao carregar catalogo de cursos.</td></tr>';
  }
}

async function arquivarCurso(id, nome) {
  if (
    !confirm(
      `Deseja arquivar o curso "${nome}"? Ele sairá da vitrine dos alunos, mas o histórico será mantido.`
    )
  )
    return;
  try {
    const response = await fetch(`${API_URL}/cursos/${id}/arquivar`, {
      method: "PUT",
      headers: { Authorization: `Bearer ${token}` },
    });
    if (response.ok) {
      alert(`Curso "${nome}" arquivado com sucesso!`);
      carregarCursosAdmin();
      carregarCursosNoSelect();
    } else {
      const data = await response.json();
      alert(data.erro || "Erro ao arquivar curso.");
    }
  } catch (error) {
    alert("Erro de conexão ao arquivar curso.");
  }
}

async function excluirCurso(id, nome) {
  if (
    !confirm(
      `ATENÇÃO: Deseja realmente EXCLUIR DEFINITIVAMENTE o curso "${nome}"?\n\nEsta ação removerá o curso e todas as suas turmas associadas. Não poderá ser desfeita.`
    )
  )
    return;
  try {
    const response = await fetch(`${API_URL}/cursos/${id}`, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${token}` },
    });
    if (response.ok) {
      alert(`Curso "${nome}" excluído com sucesso!`);
      carregarCursosAdmin();
      carregarCursosNoSelect();
      if (typeof carregarMetricas === 'function') carregarMetricas();
    } else {
      const data = await response.json();
      alert(data.erro || "Erro ao excluir curso.");
    }
  } catch (error) {
    alert("Erro de conexão ao excluir o curso.");
  }
}

async function excluirCursoDoModal() {
  const id = document.getElementById("editCursoId").value;
  const nome = document.getElementById("editNome").value || "Curso";
  if (!id) return;

  if (
    confirm(
      `ATENÇÃO: Deseja realmente EXCLUIR DEFINITIVAMENTE o curso "${nome}"?\n\nEsta ação removerá o curso e todas as suas turmas associadas. Não poderá ser desfeita.`
    )
  ) {
    try {
      const response = await fetch(`${API_URL}/cursos/${id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });

      if (response.ok) {
        alert(`Curso "${nome}" excluído com sucesso!`);
        if (modalEditarCursoInstance) modalEditarCursoInstance.hide();
        carregarCursosAdmin();
        carregarCursosNoSelect();
        if (typeof carregarMetricas === "function") carregarMetricas();
      } else {
        const data = await response.json();
        alert(data.erro || "Erro ao excluir curso.");
      }
    } catch (error) {
      alert("Erro de conexão ao excluir o curso.");
    }
  }
}

window.excluirCurso = excluirCurso;
window.excluirCursoDoModal = excluirCursoDoModal;

// ============================================================================
// 7. MODAL DE EDICAO DE CURSO
// ============================================================================
let modalEditarCursoInstance = null;

document.addEventListener("DOMContentLoaded", () => {
  const modalEl = document.getElementById("modalEditarCurso");
  if (modalEl) modalEditarCursoInstance = new bootstrap.Modal(modalEl);
  carregarCursosAdmin();
});

function abrirModalEdicao(cursoParam) {
  if (!modalEditarCursoInstance) return;
  const curso =
    typeof cursoParam === "object"
      ? cursoParam
      : window.cursosAdminMap.get(String(cursoParam));
  if (!curso) return;

  document.getElementById("editCursoId").value = curso.id;
  document.getElementById("editNome").value = curso.nome;
  document.getElementById("editDescricao").value = curso.descricao;
  document.getElementById("editMotivo").value = curso.motivo_modelo || "";
  document.getElementById("editRestricoes").value = curso.restricoes || "";
  document.getElementById("editLocal").value = curso.localizacao;
  document.getElementById("editFoto").value = curso.foto_url || "";
  dropzoneEditCursoHandler.updatePreview(curso.foto_url || "");

  const selectPrincipal = document.getElementById("selectProfissional");
  const selectEdit = document.getElementById("editProfissional");
  if (selectPrincipal && selectEdit) {
    selectEdit.innerHTML = selectPrincipal.innerHTML;
    selectEdit.value = curso.profissional_id;
  }

  document.getElementById("msgEditCurso").innerHTML = "";
  modalEditarCursoInstance.show();
}

const formEditarCurso = document.getElementById("formEditarCurso");
if (formEditarCurso) {
  formEditarCurso.addEventListener("submit", async (e) => {
    e.preventDefault();
    const id = document.getElementById("editCursoId").value;
    const msgDiv = document.getElementById("msgEditCurso");
    msgDiv.innerHTML =
      '<span class="text-primary small"><span class="spinner-border spinner-border-sm me-1"></span> A atualizar...</span>';

    const payload = {
      nome: document.getElementById("editNome").value,
      descricao: document.getElementById("editDescricao").value,
      motivo_modelo: document.getElementById("editMotivo").value,
      restricoes: document.getElementById("editRestricoes").value,
      localizacao: document.getElementById("editLocal").value,
      foto_url: document.getElementById("editFoto").value,
      profissional_id: document.getElementById("editProfissional").value,
    };

    try {
      const response = await fetch(`${API_URL}/cursos/${id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      });
      if (response.ok) {
        msgDiv.innerHTML =
          '<div class="alert alert-success py-2 small mb-0"><i class="bi bi-check2-circle me-1"></i> Curso atualizado com sucesso!</div>';
        carregarCursosAdmin();
        carregarCursosNoSelect();
        setTimeout(() => modalEditarCursoInstance.hide(), 1200);
      } else {
        msgDiv.innerHTML =
          '<div class="alert alert-danger py-2 small mb-0">Erro ao atualizar curso.</div>';
      }
    } catch (error) {
      msgDiv.innerHTML =
        '<div class="alert alert-danger py-2 small mb-0"><i class="bi bi-wifi-off me-1"></i> Erro de conexao.</div>';
    }
  });
}

// ============================================================================
// 8. PAUTAS GLOBAIS (ACCORDION)
// ============================================================================
async function carregarPautasGlobais() {
  const accordion = document.getElementById("accordionPautasGlobais");
  if (!accordion) return;

  try {
    const response = await fetch(`${API_URL}/admin/pautas-globais`, {
      headers: { Authorization: `Bearer ${token}` },
    });

    if (response.status === 401) {
      localStorage.removeItem("token");
      window.location.href = "index.html";
      return;
    }

    const cursos = await response.json();
    accordion.innerHTML = "";

    if (!response.ok) {
      accordion.innerHTML = `<div class="alert alert-danger p-3"><i class="bi bi-exclamation-triangle-fill me-2"></i>${escapeHTML(cursos.erro || "Erro ao carregar as pautas.")}</div>`;
      return;
    }

    if (!Array.isArray(cursos) || cursos.length === 0) {
      accordion.innerHTML =
        '<div class="empty-state-card py-4"><h6 class="empty-state-title">Nenhum curso ativo cadastrado no sistema.</h6></div>';
      return;
    }

    cursos.forEach((curso, index) => {
      const profNome = escapeHTML(
        curso.usuarios ? curso.usuarios.nome : "Professor a definir"
      );
      const cursoNome = escapeHTML(curso.nome);
      let disponibilidadesHTML = "";

      if (curso.disponibilidades && curso.disponibilidades.length > 0) {
        curso.disponibilidades.sort(
          (a, b) => new Date(a.data_hora) - new Date(b.data_hora)
        );

        curso.disponibilidades.forEach((disp) => {
          const dataFormatada = new Date(disp.data_hora).toLocaleString(
            "pt-BR",
            { dateStyle: "short", timeStyle: "short" }
          );
          const agendamentos = disp.agendamentos || [];

          let tabelaModelos = "";
          if (agendamentos.length === 0) {
            tabelaModelos =
              '<div class="text-center py-2 text-muted small bg-light rounded mt-2">Nenhum modelo inscrito para esta data ainda.</div>';
          } else {
            const linhas = agendamentos
              .map((ag) => {
                let badgeStatus = "";
                if (ag.status === "agendado")
                  badgeStatus =
                    '<span class="badge-custom badge-status-agendado">Agendado</span>';
                else if (ag.status === "concluido")
                  badgeStatus =
                    '<span class="badge-custom badge-status-concluido">Concluido</span>';
                else
                  badgeStatus =
                    '<span class="badge-custom badge-status-cancelado">Cancelado</span>';

                const nomeModelo = escapeHTML(
                  ag.usuarios ? ag.usuarios.nome : "Modelo"
                );
                const telLimpo = (ag.usuarios?.telefone || "").replace(
                  /\D/g,
                  ""
                );
                const msgZap = encodeURIComponent(
                  `Ola, ${ag.usuarios?.nome || ""}! Aqui e a Coordenacao do SENAC referente ao curso ${curso.nome}.`
                );
                const btnZap = telLimpo
                  ? `<a href="https://wa.me/55${telLimpo}?text=${msgZap}" target="_blank" class="btn btn-sm btn-outline-success border-0 px-2 py-1" title="WhatsApp"><i class="bi bi-whatsapp"></i> ${escapeHTML(ag.usuarios.telefone)}</a>`
                  : '<span class="text-muted small">-</span>';

                const btnCancelarAdmin =
                  ag.status === "agendado"
                    ? `<button class="btn btn-sm btn-outline-danger py-0 px-2" onclick="cancelarAgendamentoCoord('${ag.id}', '${(ag.usuarios?.nome || "").replace(/'/g, "\\'")}')"><i class="bi bi-x-circle me-1"></i> Cancelar</button>`
                    : "";

                return `
                  <tr>
                    <td class="fw-semibold text-dark font-heading">${nomeModelo}</td>
                    <td>${btnZap}</td>
                    <td>${badgeStatus}</td>
                    <td class="text-end">${btnCancelarAdmin}</td>
                  </tr>`;
              })
              .join("");

            tabelaModelos = `
              <div class="table-responsive mt-2">
                <table class="table table-custom align-middle">
                  <thead><tr><th>Modelo</th><th>Contato</th><th>Status</th><th class="text-end">Acoes</th></tr></thead>
                  <tbody>${linhas}</tbody>
                </table>
              </div>`;
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
            </div>`;
        });
      } else {
        disponibilidadesHTML =
          '<div class="alert alert-light border text-muted small mb-0"><i class="bi bi-info-circle me-1"></i> Nenhum horario cadastrado para este curso.</div>';
      }

      const itemOpen = index === 0 ? "show" : "";
      const btnCollapsed = index === 0 ? "" : "collapsed";

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
            <div class="accordion-body">${disponibilidadesHTML}</div>
          </div>
        </div>`;
    });
  } catch (error) {
    accordion.innerHTML =
      '<div class="alert alert-danger p-3"><i class="bi bi-wifi-off me-2"></i>Erro ao carregar pautas globais.</div>';
  }
}

async function cancelarAgendamentoCoord(agendamentoId, nome) {
  if (
    !confirm(
      `Deseja cancelar a inscricao de ${nome}? A vaga sera reaberta automaticamente.`
    )
  )
    return;
  try {
    const response = await fetch(
      `${API_URL}/agendamentos/${agendamentoId}/cancelar-admin`,
      {
        method: "PUT",
        headers: { Authorization: `Bearer ${token}` },
      }
    );
    if (response.ok) {
      carregarPautasGlobais();
      carregarMetricas();
    } else {
      const err = await response.json();
      alert(err.erro || "Erro ao cancelar inscricao.");
    }
  } catch (error) {
    alert("Erro na conexao com o servidor.");
  }
}

// Carregar pautas ao clicar na aba
const pautasTab = document.getElementById("pautas-tab");
if (pautasTab) pautasTab.addEventListener("click", carregarPautasGlobais);

// ============================================================================
// 9. MODERACAO DE CANDIDATOS (apenas perfil candidato)
// ============================================================================
let baseCandidatos = [];

async function carregarCandidatos() {
  const tbody = document.getElementById("tabelaUsuariosBody");
  if (!tbody) return;

  try {
    const response = await fetch(`${API_URL}/admin/usuarios`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    const todos = await response.json();
    // Coordenador so ve candidatos
    baseCandidatos = Array.isArray(todos)
      ? todos.filter((u) => u.perfil === "candidato")
      : [];
    renderizarCandidatos(baseCandidatos);
  } catch (error) {
    tbody.innerHTML =
      '<tr><td colspan="7" class="text-danger text-center py-4"><i class="bi bi-wifi-off me-2"></i>Erro ao ligar ao servidor.</td></tr>';
  }
}

function renderizarCandidatos(lista) {
  const tbody = document.getElementById("tabelaUsuariosBody");
  if (!tbody) return;
  tbody.innerHTML = "";

  if (!Array.isArray(lista) || lista.length === 0) {
    tbody.innerHTML =
      '<tr><td colspan="6" class="text-center text-muted py-4"><i class="bi bi-search me-1"></i> Nenhum candidato encontrado.</td></tr>';
    return;
  }

  lista.forEach((user) => {
    const nomeFormatado = escapeHTML(user.nome);
    const emailFormatado = escapeHTML(user.email);
    const telFormatado = escapeHTML(user.telefone || "-");
    const cursosAtivosFormatado = escapeHTML(user.cursos_ativos || "-");

    const statusBadge = user.is_bloqueado
      ? '<span class="badge-custom badge-status-bloqueado"><i class="bi bi-lock-fill"></i> Bloqueado</span>'
      : '<span class="badge-custom badge-status-concluido"><i class="bi bi-check-circle-fill"></i> Ativo</span>';

    const badgeLgpd = user.consentimento_termos
      ? '<span class="badge bg-success-subtle text-success border border-success-subtle" style="font-size: 0.72rem;" title="Termos LGPD Aceitos"><i class="bi bi-shield-check me-1"></i> LGPD OK</span>'
      : '<span class="badge bg-danger-subtle text-danger border border-danger-subtle" style="font-size: 0.72rem;" title="Termos LGPD Não Aceitos"><i class="bi bi-shield-x me-1"></i> Sem LGPD</span>';

    const badgeImagem = user.consentimento_imagem
      ? '<span class="badge bg-info-subtle text-info-emphasis border border-info-subtle" style="font-size: 0.72rem;" title="Uso de Imagem Autorizado"><i class="bi bi-camera-fill me-1"></i> Imagem OK</span>'
      : '<span class="badge bg-light text-muted border" style="font-size: 0.72rem;" title="Uso de Imagem Não Autorizado"><i class="bi bi-camera-video-off me-1"></i> Sem Imagem</span>';

    const telLimpo = (user.telefone || "").replace(/\D/g, "");
    const msgZap = encodeURIComponent(
      `Olá, ${user.nome}! Aqui é a Coordenação do Connect Senac.`
    );
    const btnZap = telLimpo
      ? `<a href="https://wa.me/55${telLimpo}?text=${msgZap}" target="_blank" class="btn btn-sm btn-outline-success py-1 px-2" title="Conversar no WhatsApp"><i class="bi bi-whatsapp"></i></a>`
      : '<span class="text-muted small">-</span>';

    const btnBloqueio = user.is_bloqueado
      ? `<button class="btn btn-sm btn-success fw-bold py-1 px-2" onclick="toggleBloqueioCandidato('${user.id}', true)" title="Clique para desbloquear este modelo"><i class="bi bi-unlock-fill me-1"></i>Desbloquear</button>`
      : `<button class="btn btn-sm btn-warning text-dark fw-bold py-1 px-2" onclick="toggleBloqueioCandidato('${user.id}', false)" title="Clique para bloquear este modelo"><i class="bi bi-lock-fill me-1"></i>Bloquear</button>`;

    const btnExcluir = `<button class="btn btn-sm btn-danger fw-bold py-1 px-2" onclick="excluirCandidato('${user.id}', decodeURIComponent('${encodeURIComponent(user.nome || 'Candidato')}'))" title="Excluir modelo permanentemente"><i class="bi bi-trash-fill me-1"></i>Excluir</button>`;

    const sessoesBadge = `
      <div class="d-flex flex-wrap justify-content-center gap-1" style="font-size: 0.74rem;">
        <span class="badge bg-primary-subtle text-primary border" title="Agendados">${user.total_agendados || 0} Agend.</span>
        <span class="badge bg-success-subtle text-success border" title="Concluídos">${user.total_concluidos || 0} Conc.</span>
        <span class="badge bg-danger-subtle text-danger border" title="Cancelados">${user.total_cancelados || 0} Canc.</span>
      </div>
    `;

    tbody.innerHTML += `
      <tr>
        <td>
          <div class="fw-bold font-heading text-dark">${nomeFormatado}</div>
          ${statusBadge}
        </td>
        <td>
          <div class="small text-dark">${emailFormatado}</div>
          <div class="text-muted small">${telFormatado}</div>
        </td>
        <td>
          <div class="d-flex flex-column gap-1">${badgeLgpd}${badgeImagem}</div>
        </td>
        <td><span class="text-secondary small fw-semibold">${cursosAtivosFormatado}</span></td>
        <td class="text-center">${sessoesBadge}</td>
        <td class="text-center text-nowrap">
          <div class="d-inline-flex align-items-center gap-1">
            ${btnZap}
            ${btnBloqueio}
            ${btnExcluir}
          </div>
        </td>
      </tr>`;
  });
}

function aplicarFiltroCandidatos() {
  const termo = (
    document.getElementById("filtroTextoUser")?.value || ""
  ).toLowerCase();
  const filtrados = baseCandidatos.filter(
    (u) =>
      (u.nome || "").toLowerCase().includes(termo) ||
      (u.email || "").toLowerCase().includes(termo)
  );
  renderizarCandidatos(filtrados);
}

async function toggleBloqueioCandidato(id, statusAtual) {
  const acao = statusAtual ? "desbloquear" : "bloquear";
  if (!confirm(`Tem certeza que deseja ${acao} este modelo?`)) return;

  try {
    const response = await fetch(`${API_URL}/admin/usuarios/${id}/bloquear`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`
      },
      body: JSON.stringify({ is_bloqueado: !statusAtual })
    });

    const resData = await response.json();
    if (response.ok) {
      alert(resData.mensagem || `Modelo ${statusAtual ? "desbloqueado" : "bloqueado"} com sucesso!`);
      carregarCandidatos();
      carregarMetricas();
    } else {
      alert(resData.erro || "Erro ao alterar status.");
    }
  } catch (error) {
    alert("Erro de conexão ao alterar status.");
  }
}

async function excluirCandidato(id, nome) {
  if (
    !confirm(
      `ATENÇÃO: Tem certeza que deseja remover permanentemente a conta de "${nome}"? Todos seus agendamentos serão excluídos.`
    )
  )
    return;
  try {
    const response = await fetch(`${API_URL}/admin/usuarios/${id}`, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${token}` },
    });
    const resData = await response.json();
    if (response.ok) {
      alert(resData.mensagem || `Modelo "${nome}" excluído com sucesso!`);
      carregarCandidatos();
      carregarMetricas();
    } else {
      alert(resData.erro || "Erro ao remover conta.");
    }
  } catch (error) {
    alert("Erro na conexão com o servidor ao excluir modelo.");
  }
}

const inputBusca = document.getElementById("filtroTextoUser");
const btnLimpar = document.getElementById("btnLimparFiltros");

if (inputBusca) inputBusca.addEventListener("input", aplicarFiltroCandidatos);
if (btnLimpar) {
  btnLimpar.addEventListener("click", () => {
    if (inputBusca) inputBusca.value = "";
    renderizarCandidatos(baseCandidatos);
  });
}

// Carregar candidatos ao clicar na aba de moderacao
const moderacaoTab = document.getElementById("moderacao-tab");
if (moderacaoTab) moderacaoTab.addEventListener("click", carregarCandidatos);

// ============================================================================
// INICIALIZACOES
// ============================================================================
carregarMetricas();
carregarProfissionaisNoSelect();
carregarCursosNoSelect();
carregarPautasGlobais();
carregarCandidatos();

async function desarquivarCurso(id, nome) {
    if(!confirm(`Deseja reativar o curso "${nome}"? Ele voltará a ser exibido na vitrine pública para os alunos e modelos.`)) return;

    try {
        const response = await fetch(`${API_URL}/cursos/${id}/desarquivar`, {
            method: 'PUT',
            headers: { 'Authorization': `Bearer ${token}` }
        });

        if (response.ok) {
            alert(`Curso "${nome}" reativado com sucesso!`);
            if (typeof carregarCursosAdmin === 'function') carregarCursosAdmin();
            if (typeof carregarCursosCoord === 'function') carregarCursosCoord();
            if (typeof carregarMetricasAdmin === 'function') carregarMetricasAdmin();
        } else {
            const data = await response.json();
            alert(data.erro || 'Erro ao reativar curso.');
        }
    } catch (error) {
        alert('Erro ao conectar com o servidor.');
    }
}

// Exportações globais para a tabela
window.excluirCandidato = excluirCandidato;
window.toggleBloqueioCandidato = toggleBloqueioCandidato;
