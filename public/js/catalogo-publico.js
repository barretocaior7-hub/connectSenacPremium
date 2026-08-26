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
      : `<a class="btn btn-outline-light btn-sm" href="${authUrl('/login')}">Entrar</a><a class="btn btn-orange btn-sm" href="${authUrl('/cadastro')}">Criar conta</a>`;
  }

  const list = document.getElementById("publicCourseList");
  const search = document.getElementById("publicCourseSearch");
  let courses = [];

  const render = () => {
    if (!list) return;
    const term = (search?.value || "").trim().toLowerCase();
    const filtered = courses.filter((course) => `${course.nome} ${course.descricao || ""} ${course.usuarios?.nome || ""}`.toLowerCase().includes(term));
    if (!filtered.length) {
      list.innerHTML = '<div class="col-12"><div class="empty-state-card"><h3 class="empty-state-title">Nenhum curso encontrado</h3><p class="empty-state-desc">Tente buscar usando outro termo.</p></div></div>';
      return;
    }
    list.innerHTML = filtered.map((course) => {
      const image = escapeHTML(course.foto_url || "/assets/logo-connect-senac.png");
      return `<div class="col-md-6 col-lg-4"><article class="card-premium public-course-card h-100"><a href="/cursos/${encodeURIComponent(course.id)}" class="public-course-card-link"><div class="card-img-container"><img src="${image}" alt="${escapeHTML(course.nome)}"><span class="course-badge">Curso SENAC</span></div><div class="card-body p-4"><h2>${escapeHTML(course.nome)}</h2><p><i class="bi bi-geo-alt-fill"></i> ${escapeHTML(course.localizacao || "SENAC")}</p><span class="public-course-cta">Ver detalhes <i class="bi bi-arrow-right"></i></span></div></a></article></div>`;
    }).join("");
  };

  if (list) {
    fetch(`${API_BASE}/cursos/ativos`)
      .then((response) => { if (!response.ok) throw new Error(); return response.json(); })
      .then((data) => { courses = Array.isArray(data) ? data : []; render(); })
      .catch(() => { list.innerHTML = '<div class="col-12"><div class="alert alert-danger">Não foi possível carregar os cursos.</div></div>'; });
    search?.addEventListener("input", render);
  }

  document.getElementById("btnProtectedEnrollment")?.addEventListener("click", (event) => {
    const courseId = event.currentTarget.dataset.courseId;
    if (!session) {
      window.location.assign(authUrl("/login"));
      return;
    }
    if (session.payload.perfil !== "candidato") {
      window.location.assign(dashboardFor(session.payload.perfil));
      return;
    }
    window.location.assign(`/painel.html?curso=${encodeURIComponent(courseId)}#vitrine`);
  });
})();
