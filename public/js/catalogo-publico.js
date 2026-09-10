(() => {
  const API_BASE = `${window.location.origin}/api`;

  const escapeHTML = (value = "") => String(value)
    .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;").replace(/'/g, "&#39;");

  const getSession = () => {
    const token = localStorage.getItem("token");
    if (!token) return null;
    try {
      const payload = JSON.parse(atob(token.split(".")[1].replace(/-/g, "+").replace(/_/g, "/")));
      if (!payload.id || (payload.exp && payload.exp * 1000 <= Date.now())) throw new Error();
      return { token, payload };
    } catch (_) {
      localStorage.removeItem("token");
      return null;
    }
  };

  const currentReturnUrl = () => `${window.location.pathname}${window.location.search}${window.location.hash}`;
  const authUrl = (page) => `${page}?returnUrl=${encodeURIComponent(currentReturnUrl())}`;

  const dashboardFor = (perfil) => {
    if (perfil === "admin" || perfil === "coordenador") return "/admin.html";
    if (perfil === "profissional") return "/profissional.html";
    return "/painel.html";
  };

  const session = getSession();
  const authActions = document.getElementById("publicAuthActions");
  if (authActions) {
    authActions.innerHTML = session
      ? `<a class="btn btn-outline-light btn-sm" href="${dashboardFor(session.payload.perfil)}"><i class="bi bi-person-circle"></i> Minha área</a>`
      : `<a class="btn btn-outline-light btn-sm" href="${authUrl('/index.html')}">Entrar</a><a class="btn btn-orange btn-sm" href="${authUrl('/cadastro.html')}">Criar conta</a>`;
  }

  const list = document.getElementById("publicCourseList");
  const search = document.getElementById("publicCourseSearch");
  let courses = [];

  const getDeptoAtivo = () => {
    return window.SenacLocalizacao ? window.SenacLocalizacao.getDepartamentoUsuario() : 'DR/BA';
  };

  const render = () => {
    if (!list) return;
    const term = (search?.value || "").trim().toLowerCase();
    const filtered = courses.filter((course) => `${course.nome} ${course.descricao || ""} ${course.usuarios?.nome || ""}`.toLowerCase().includes(term));
    if (!filtered.length) {
      const deptoAtual = getDeptoAtivo();
      const nomeDepto = window.SenacLocalizacao ? window.SenacLocalizacao.getNomeDepartamento(deptoAtual) : deptoAtual;
      list.innerHTML = `
        <div class="col-12">
          <div class="empty-state-card p-5 text-center bg-white rounded-3 shadow-sm border">
            <div class="mb-3 text-warning fs-1"><i class="bi bi-geo-alt"></i></div>
            <h3 class="empty-state-title">Nenhum curso disponível para ${escapeHTML(nomeDepto)}</h3>
            <p class="empty-state-desc text-muted mb-3">
              Não encontramos procedimentos abertos para esta região no momento. Você pode selecionar outro estado para conferir vagas disponíveis.
            </p>
            <button class="btn btn-outline-primary btn-sm px-3" onclick="if(window.SenacLocalizacao) SenacLocalizacao.abrirModalSelecao()">
              <i class="bi bi-globe me-1"></i> Escolher Outro Estado
            </button>
          </div>
        </div>
      `;
      return;
    }
    list.innerHTML = filtered.map((course) => {
      const image = escapeHTML(course.foto_url || "/assets/logo-connect-senac.png");
      const deptoBadge = course.departamento ? `<span class="badge bg-primary text-white position-absolute top-0 end-0 m-2 shadow-sm" style="font-size: 0.72rem;">${escapeHTML(course.departamento)}</span>` : '';
      return `<div class="col-md-6 col-lg-4"><article class="card-premium public-course-card h-100 position-relative"><a href="/cursos/${encodeURIComponent(course.id)}" class="public-course-card-link"><div class="card-img-container"><img src="${image}" alt="${escapeHTML(course.nome)}"><span class="course-badge">Curso SENAC</span>${deptoBadge}</div><div class="card-body p-4"><h2>${escapeHTML(course.nome)}</h2><p><i class="bi bi-geo-alt-fill"></i> ${escapeHTML(course.localizacao || "SENAC")}</p><span class="public-course-cta">Ver detalhes <i class="bi bi-arrow-right"></i></span></div></a></article></div>`;
    }).join("");
  };

  const carregarCursosPublicos = () => {
    if (!list) return;
    const depto = getDeptoAtivo();
    const query = depto ? `?departamento=${encodeURIComponent(depto)}` : '';

    if (window.SenacLocalizacao) {
      window.SenacLocalizacao.renderizarBarraOuBanner('containerLocalizacaoCursos', () => {
        carregarCursosPublicos();
      });
    }

    list.innerHTML = '<div class="col-12 text-center py-5"><span class="spinner-border text-primary"></span><p class="mt-3 text-muted">Buscando cursos para sua região...</p></div>';

    fetch(`${API_BASE}/cursos/ativos${query}`)
      .then((response) => { if (!response.ok) throw new Error(); return response.json(); })
      .then((data) => { courses = Array.isArray(data) ? data : []; render(); })
      .catch(() => { list.innerHTML = '<div class="col-12"><div class="alert alert-danger text-center"><i class="bi bi-wifi-off me-2"></i>Não foi possível carregar os cursos da sua região.</div></div>'; });
  };

  if (list) {
    carregarCursosPublicos();
    search?.addEventListener("input", render);

    window.addEventListener('senacRegiaoUsuarioChanged', () => {
      carregarCursosPublicos();
    });
  }

  document.getElementById("btnProtectedEnrollment")?.addEventListener("click", (event) => {
    const courseId = event.currentTarget.dataset.courseId;
    if (!session) {
      window.location.assign(authUrl("/index.html"));
      return;
    }
    if (session.payload.perfil !== "candidato") {
      window.location.assign(dashboardFor(session.payload.perfil));
      return;
    }
    window.location.assign(`/painel.html?curso=${encodeURIComponent(courseId)}#vitrine`);
  });
})();
