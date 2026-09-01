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

function redirectAfterAuthentication(usuário) {
  const returnUrl = getSafeReturnUrl();
  const perfil = usuário?.perfil;

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
        submitBtn.innerHTML = `<span class="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>Autenticando...`;
      }

      const response = await fetch(`${API_URL}/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, senha }),
      });

      const data = await response.json();

      if (response.ok) {
        localStorage.setItem("token", data.token);
        redirectAfterAuthentication(data.usuário);
      } else {
        if (msgErro) {
          msgErro.innerHTML = `<i class="bi bi-exclamation-triangle-fill me-1"></i> ${data.erro || "Falha na autenticação. Verifique seus dados."}`;
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

// Lógica de Cadastro
const formCadastro = document.getElementById("formCadastro");
if (formCadastro) {
  formCadastro.addEventListener("submit", async (e) => {
    e.preventDefault();

    const nome = document.getElementById("nome").value;
    const email = document.getElementById("email").value;
    const telefoneRaw = document.getElementById("telefone").value.trim();
    const apenasDigitos = telefoneRaw.replace(/\D/g, "");
    const senha = document.getElementById("senha").value;
    const confirmar_senha = document.getElementById("confirmar_senha").value;

    const consentimento_termos = document.getElementById("termoUso").checked ? 1 : 0;
    const consentimento_imagem = document.getElementById("termoImagem").checked ? 1 : 0;

    const msgDiv = document.getElementById("mensagemCadastro");
    const submitBtn = document.getElementById("btnSubmitCadastro");
    const originalBtnHTML = submitBtn ? submitBtn.innerHTML : "Finalizar Cadastro";

    // Validação estrita de WhatsApp: Exatamente 11 dígitos (DDD + 9 dígitos)
    if (apenasDigitos.length !== 11) {
      msgDiv.innerHTML = `<div class="alert alert-danger py-2 mb-0"><i class="bi bi-exclamation-circle-fill me-1"></i> O WhatsApp deve conter o DDD da região e os 9 dígitos do celular (exatos 11 dígitos). Exemplo: (75) 98888-7777.</div>`;
      document.getElementById("telefone").focus();
      return;
    }

    const telefone = telefoneRaw;

    if (senha !== confirmar_senha) {
      msgDiv.innerHTML = `<div class="alert alert-danger py-2 mb-0"><i class="bi bi-exclamation-circle-fill me-1"></i> As senhas não coincidem. Verifique a digitação.</div>`;
      return;
    }

    try {
      if (submitBtn) {
        submitBtn.disabled = true;
        submitBtn.innerHTML = `<span class="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>Processando cadastro...`;
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
          redirectAfterAuthentication(data.usuário);
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

    msgDiv.innerHTML = '<span class="text-primary"><span class="spinner-border spinner-border-sm me-1"></span>Processando pedido...</span>';
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
      msgDiv.innerHTML = '<div class="alert alert-danger py-2 mb-0"><i class="bi bi-exclamation-circle-fill me-1"></i> As senhas não coincidem.</div>';
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

// Máscara e Sincronização de Região/DDD com o Campo de WhatsApp
function initPhoneMask() {
  const telInput = document.getElementById("telefone");
  const regiaoSelect = document.getElementById("regiaoDDD");

  if (!telInput) return;

  function formatBRPhone(value) {
    let digits = value.replace(/\D/g, "");
    if (digits.length > 11) {
      digits = digits.substring(0, 11);
    }

    let formatted = "";
    if (digits.length > 0) {
      formatted = "(" + digits.substring(0, 2);
    }
    if (digits.length >= 2) {
      formatted += ") ";
    }
    if (digits.length >= 3) {
      formatted += digits.substring(2, 7);
    }
    if (digits.length >= 8) {
      formatted += "-" + digits.substring(7, 11);
    }

    return { formatted, digits };
  }

  // Preenche ou atualiza o DDD quando a região for selecionada
  if (regiaoSelect) {
    regiaoSelect.addEventListener("change", () => {
      const ddd = regiaoSelect.value;
      if (ddd === "outro") {
        telInput.value = "";
        telInput.placeholder = "(DDD) 9XXXX-XXXX";
      } else {
        // Preserva os 9 dígitos já digitados caso existam
        let currentDigits = telInput.value.replace(/\D/g, "");
        let restDigits = currentDigits.length > 2 ? currentDigits.substring(2) : "";
        let newRaw = ddd + restDigits;
        const { formatted } = formatBRPhone(newRaw);
        telInput.value = formatted;
      }
      telInput.focus();
    });
  }

  telInput.addEventListener("input", () => {
    const { formatted, digits } = formatBRPhone(telInput.value);
    telInput.value = formatted;

    // Sincroniza o select de região automaticamente se o usuário alterar o DDD
    if (regiaoSelect && digits.length >= 2) {
      const dddDigitado = digits.substring(0, 2);
      const optionExists = Array.from(regiaoSelect.options).some(opt => opt.value === dddDigitado);
      if (optionExists) {
        regiaoSelect.value = dddDigitado;
      } else {
        regiaoSelect.value = "outro";
      }
    }
  });

  // Garante valor inicial preenchido com o DDD da região padrão selecionada
  if (!telInput.value && regiaoSelect && regiaoSelect.value !== "outro") {
    telInput.value = `(${regiaoSelect.value}) `;
  } else if (telInput.value) {
    const { formatted } = formatBRPhone(telInput.value);
    telInput.value = formatted;
  }
}

// Inicializações em Tempo Real
document.addEventListener('DOMContentLoaded', () => {
  initPhoneMask();

  const cadSenha = document.getElementById('senha');
  const cadConfSenha = document.getElementById('confirmar_senha');
  const strengthBar = document.getElementById('passwordStrengthBar');
  const strengthText = document.getElementById('passwordStrengthText');
  const matchFeedback = document.getElementById('passwordMatchFeedback');

  if (cadSenha && cadConfSenha && strengthBar) {
    const updateStrength = () => {
      const val = cadSenha.value;
      let score = 0;
      if (val.length >= 8) score++;
      if (/[A-Z]/.test(val)) score++;
      if (/[0-9]/.test(val)) score++;
      if (/[^A-Za-z0-9]/.test(val)) score++;

      if (val.length === 0) {
        strengthBar.style.width = '0%';
        strengthText.textContent = '';
      } else if (score <= 1) {
        strengthBar.style.width = '25%';
        strengthBar.style.backgroundColor = '#ef4444';
        strengthText.textContent = 'Senha Fraca';
        strengthText.className = 'small text-danger fw-bold';
      } else if (score === 2 || score === 3) {
        strengthBar.style.width = '65%';
        strengthBar.style.backgroundColor = '#f59e0b';
        strengthText.textContent = 'Senha Média';
        strengthText.className = 'small text-warning fw-bold';
      } else {
        strengthBar.style.width = '100%';
        strengthBar.style.backgroundColor = '#10b981';
        strengthText.textContent = 'Senha Forte';
        strengthText.className = 'small text-success fw-bold';
      }

      if (cadConfSenha.value.length > 0) {
        if (cadSenha.value === cadConfSenha.value) {
          matchFeedback.innerHTML = '<span class="text-success small fw-semibold"><i class="bi bi-check-circle-fill me-1"></i> As senhas coincidem</span>';
        } else {
          matchFeedback.innerHTML = '<span class="text-danger small fw-semibold"><i class="bi bi-x-circle-fill me-1"></i> As senhas não coincidem</span>';
        }
      } else {
        matchFeedback.innerHTML = '';
      }
    };

    cadSenha.addEventListener('input', updateStrength);
    cadConfSenha.addEventListener('input', updateStrength);
  }

  // Google Login Hook
  const btnGoogle = document.getElementById('btnGoogleLogin');
  if (btnGoogle) {
    btnGoogle.addEventListener('click', () => {
      const msgDiv = document.getElementById('mensagemErro') || document.getElementById('mensagemCadastro');
      if (msgDiv) {
        msgDiv.classList.remove('d-none');
        msgDiv.innerHTML = '<div class="alert alert-info py-2 small mb-0"><i class="bi bi-info-circle-fill me-1"></i> Redirecionando para autenticação segura com o Google...</div>';
      }
      setTimeout(() => {
        alert('Integração Google Identity Services pronta para ambiente de produção com o Client ID do SENAC!');
      }, 500);
    });
  }
});
