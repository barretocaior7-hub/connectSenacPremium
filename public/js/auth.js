// frontend/js/auth.js

const isLocalDev = window.location.protocol === 'file:' || 
  ((window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') && window.location.port !== '3000');

const API_URL = isLocalDev 
  ? 'http://localhost:3000/api/usuarios' 
  : `${window.location.origin}/api/usuarios`;

function getSafeReturnUrl() {
  const params = new URLSearchParams(window.location.search);
  const cursoId = params.get("curso");
  if (cursoId) {
    return `painel.html?curso=${encodeURIComponent(cursoId)}`;
  }

  const rawReturnUrl = params.get("returnUrl");
  if (!rawReturnUrl || rawReturnUrl.startsWith("//")) return null;

  try {
    const parsed = new URL(rawReturnUrl, window.location.origin);
    if (parsed.origin !== window.location.origin) return null;
    return `${parsed.pathname}${parsed.search}${parsed.hash}`;
  } catch (_) {
    return null;
  }
}

function redirectAfterAuthentication(utilizador) {
  const returnUrl = getSafeReturnUrl();
  const perfil = utilizador?.perfil;

  if (perfil === "admin") return window.location.assign("admin.html");
  if (perfil === "coordenador") return window.location.assign("coordenador.html");
  if (perfil === "profissional") return window.location.assign("profissional.html");
  window.location.assign(returnUrl || "painel.html");
}

function preserveReturnUrl(link) {
  const returnUrl = getSafeReturnUrl();
  if (!link || !returnUrl) return;
  const destination = new URL(link.getAttribute("href"), window.location.href);
  destination.searchParams.set("returnUrl", returnUrl);
  link.href = destination.href;
}

// Helper para alternar visibilidade de senhas
function setupPasswordToggle(buttonId, inputId, iconId) {
  const btn = document.getElementById(buttonId);
  const input = document.getElementById(inputId);
  const icon = document.getElementById(iconId);

  if (btn && input && icon) {
    btn.addEventListener("click", () => {
      const isPassword = input.type === "password";
      input.type = isPassword ? "text" : "password";
      icon.className = isPassword ? "bi bi-eye-slash" : "bi bi-eye";
    });
  }
}

// Inicializar toggles de senha disponíveis na página
document.addEventListener("DOMContentLoaded", () => {
  setupPasswordToggle("btnToggleSenha", "senha", "iconToggleSenha");
  setupPasswordToggle("btnToggleSenhaCad", "senha", "iconToggleSenhaCad");
  setupPasswordToggle("btnToggleConfirmarCad", "confirmar_senha", "iconToggleConfirmarCad");
  setupPasswordToggle("btnToggleNovaSenha", "novaSenha", "iconToggleNovaSenha");
  setupPasswordToggle("btnToggleConfirmarNovaSenha", "confirmarNovaSenha", "iconToggleConfirmarNovaSenha");
  preserveReturnUrl(document.getElementById("linkCadastro"));
  preserveReturnUrl(document.getElementById("linkLogin"));

  const loginPassword = document.getElementById("senha");
  const passwordPeekHint = document.getElementById("passwordPeekHint");
  if (loginPassword && passwordPeekHint) {
    const updatePasswordHint = () => {
      const shouldShow = document.activeElement === loginPassword || loginPassword.value.length > 0;
      passwordPeekHint.classList.toggle("is-visible", shouldShow);
      passwordPeekHint.parentElement.classList.toggle("password-hint-active", shouldShow);
      passwordPeekHint.setAttribute("aria-hidden", String(!shouldShow));
    };

    loginPassword.addEventListener("focus", updatePasswordHint);
    loginPassword.addEventListener("input", updatePasswordHint);
    loginPassword.addEventListener("blur", updatePasswordHint);
    updatePasswordHint();
  }
});

// Lógica de Login
const formLogin = document.getElementById("formLogin");
if (formLogin) {
  const animateLoginError = () => {
    const formWrap = formLogin.closest(".login-form-wrap");
    if (!formWrap || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    formWrap.classList.remove("login-shake");
    void formWrap.offsetWidth;
    formWrap.classList.add("login-shake");
    formWrap.addEventListener("animationend", () => formWrap.classList.remove("login-shake"), { once: true });
  };

  formLogin.addEventListener("submit", async (e) => {
    e.preventDefault();

    const email = document.getElementById("email").value;
    const senha = document.getElementById("senha").value;
    const msgErro = document.getElementById("mensagemErro");
    const submitBtn = document.getElementById("btnSubmitLogin");
    const originalBtnHTML = submitBtn ? submitBtn.innerHTML : "Entrar";

    try {
      if (msgErro) msgErro.classList.add("d-none");
      if (submitBtn) {
        submitBtn.disabled = true;
        submitBtn.innerHTML = `<span class="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>A autenticar...`;
      }

      const response = await fetch(`${API_URL}/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, senha }),
      });

      const data = await response.json();

      if (response.ok) {
        localStorage.setItem("token", data.token);
        redirectAfterAuthentication(data.utilizador);
      } else {
        if (msgErro) {
          msgErro.innerHTML = `<i class="bi bi-exclamation-triangle-fill me-1"></i> ${data.erro || "Falha na autenticação. Verifique os seus dados."}`;
          msgErro.classList.remove("d-none");
        }
        animateLoginError();
        if (submitBtn) {
          submitBtn.disabled = false;
          submitBtn.innerHTML = originalBtnHTML;
        }
      }
    } catch (error) {
      console.error("Erro na requisição:", error);
      if (msgErro) {
        msgErro.innerHTML = `<i class="bi bi-wifi-off me-1"></i> Erro de conexão com o servidor. Tente novamente mais tarde.`;
        msgErro.classList.remove("d-none");
      }
      animateLoginError();
      if (submitBtn) {
        submitBtn.disabled = false;
        submitBtn.innerHTML = originalBtnHTML;
      }
    }
  });
}

// Lógica de Registo
const formCadastro = document.getElementById("formCadastro");
if (formCadastro) {
  formCadastro.addEventListener("submit", async (e) => {
    e.preventDefault();

    const nome = document.getElementById("nome").value;
    const email = document.getElementById("email").value;
    const telefone = document.getElementById("telefone").value;
    const senha = document.getElementById("senha").value;
    const confirmar_senha = document.getElementById("confirmar_senha").value;

    const consentimento_termos = document.getElementById("termoUso").checked ? 1 : 0;
    const consentimento_imagem = document.getElementById("termoImagem").checked ? 1 : 0;

    const msgDiv = document.getElementById("mensagemCadastro");
    const submitBtn = document.getElementById("btnSubmitCadastro");
    const originalBtnHTML = submitBtn ? submitBtn.innerHTML : "Finalizar Registo";

    if (senha !== confirmar_senha) {
      msgDiv.innerHTML = `<div class="alert alert-danger py-2 mb-0"><i class="bi bi-exclamation-circle-fill me-1"></i> As palavras-passe não coincidem. Verifique a digitação.</div>`;
      return;
    }

    try {
      if (submitBtn) {
        submitBtn.disabled = true;
        submitBtn.innerHTML = `<span class="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>A processar registo...`;
      }

      const response = await fetch(`${API_URL}/registrar`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          nome,
          email,
          telefone,
          senha,
          confirmar_senha,
          consentimento_termos,
          consentimento_imagem,
        }),
      });

      const data = await response.json();

      if (response.ok) {
        localStorage.setItem("token", data.token);
        msgDiv.innerHTML = `<div class="alert alert-success py-2 mb-0"><i class="bi bi-check-circle-fill me-1"></i> Conta criada! A preparar a sua área...</div>`;
        setTimeout(() => {
          redirectAfterAuthentication(data.utilizador);
        }, 700);
      } else {
        msgDiv.innerHTML = `<div class="alert alert-danger py-2 mb-0"><i class="bi bi-exclamation-triangle-fill me-1"></i> ${data.erro}</div>`;
        if (submitBtn) {
          submitBtn.disabled = false;
          submitBtn.innerHTML = originalBtnHTML;
        }
      }
    } catch (error) {
      console.error("Erro na requisição:", error);
      msgDiv.innerHTML = `<div class="alert alert-danger py-2 mb-0"><i class="bi bi-wifi-off me-1"></i> Erro de conexão com o servidor.</div>`;
      if (submitBtn) {
        submitBtn.disabled = false;
        submitBtn.innerHTML = originalBtnHTML;
      }
    }
  });
}

// Lógica de Solicitar Recuperação
const formEsqueci = document.getElementById("formEsqueci");
if (formEsqueci) {
  formEsqueci.addEventListener("submit", async (e) => {
    e.preventDefault();
    const msgDiv = document.getElementById("msgRecuperacao");
    const email = document.getElementById("emailRecuperacao").value;
    const submitBtn = document.getElementById("btnSubmitEsqueci");
    const originalBtnHTML = submitBtn ? submitBtn.innerHTML : "Enviar";

    msgDiv.innerHTML = '<span class="text-primary"><span class="spinner-border spinner-border-sm me-1"></span>A processar pedido...</span>';
    if (submitBtn) submitBtn.disabled = true;

    try {
      const response = await fetch(`${API_URL}/esqueci-senha`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      const data = await response.json();
      msgDiv.innerHTML = `<div class="alert alert-success py-2 mt-2 mb-0"><i class="bi bi-envelope-check-fill me-1"></i> ${data.mensagem}</div>`;
      if (submitBtn) {
        submitBtn.disabled = false;
        submitBtn.innerHTML = originalBtnHTML;
      }
    } catch (error) {
      msgDiv.innerHTML = '<div class="alert alert-danger py-2 mt-2 mb-0"><i class="bi bi-wifi-off me-1"></i> Erro de conexão com o servidor.</div>';
      if (submitBtn) {
        submitBtn.disabled = false;
        submitBtn.innerHTML = originalBtnHTML;
      }
    }
  });
}

// Lógica de Redefinir Senha
const formRedefinir = document.getElementById("formRedefinir");
if (formRedefinir) {
  formRedefinir.addEventListener("submit", async (e) => {
    e.preventDefault();
    const msgDiv = document.getElementById("msgRedefinir");
    const nova_senha = document.getElementById("novaSenha").value;
    const confirmar_senha = document.getElementById("confirmarNovaSenha").value;
    const submitBtn = document.getElementById("btnSubmitRedefinir");
    const originalBtnHTML = submitBtn ? submitBtn.innerHTML : "Atualizar";

    const params = new URLSearchParams(window.location.search);
    const token = params.get("token");

    if (!token) {
      msgDiv.innerHTML = '<div class="alert alert-danger py-2 mb-0"><i class="bi bi-exclamation-octagon-fill me-1"></i> Link de recuperação inválido (Token ausente).</div>';
      return;
    }

    if (nova_senha !== confirmar_senha) {
      msgDiv.innerHTML = '<div class="alert alert-danger py-2 mb-0"><i class="bi bi-exclamation-circle-fill me-1"></i> As palavras-passe não coincidem.</div>';
      return;
    }

    try {
      if (submitBtn) {
        submitBtn.disabled = true;
        submitBtn.innerHTML = `<span class="spinner-border spinner-border-sm me-2" role="status"></span>A atualizar...`;
      }

      const response = await fetch(`${API_URL}/redefinir-senha`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, nova_senha, confirmar_senha }),
      });

      const data = await response.json();

      if (response.ok) {
        msgDiv.innerHTML = `<div class="alert alert-success py-2 mb-0"><i class="bi bi-check-circle-fill me-1"></i> ${data.mensagem} A redirecionar...</div>`;
        setTimeout(() => (window.location.href = "login.html"), 2500);
      } else {
        msgDiv.innerHTML = `<div class="alert alert-danger py-2 mb-0"><i class="bi bi-exclamation-triangle-fill me-1"></i> ${data.erro}</div>`;
        if (submitBtn) {
          submitBtn.disabled = false;
          submitBtn.innerHTML = originalBtnHTML;
        }
      }
    } catch (error) {
      msgDiv.innerHTML = '<div class="alert alert-danger py-2 mb-0"><i class="bi bi-wifi-off me-1"></i> Erro de conexão com o servidor.</div>';
      if (submitBtn) {
        submitBtn.disabled = false;
        submitBtn.innerHTML = originalBtnHTML;
      }
    }
  });
}
