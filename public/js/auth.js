// frontend/js/auth.js

const isLocalDev = window.location.protocol === 'file:' || 
  ((window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') && window.location.port !== '3000');

const API_URL = isLocalDev 
  ? 'http://localhost:3000/api/usuarios' 
  : `${window.location.origin}/api/usuarios`;

function getSafeReturnUrl() {
  const params = new URLSearchParams(window.location.search);
  const cursoId = params.get("curso");
  const horarioId = params.get("horario");
  if (cursoId) {
    const horarioParam = horarioId ? `&horario=${encodeURIComponent(horarioId)}` : '';
    return `painel.html?curso=${encodeURIComponent(cursoId)}${horarioParam}`;
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
    const ddi = document.getElementById("ddiPais")?.value || "+55";
    const telefoneRaw = document.getElementById("telefone").value.trim();
    const apenasDigitos = telefoneRaw.replace(/\D/g, "");
    const senha = document.getElementById("senha").value;
    const confirmar_senha = document.getElementById("confirmar_senha").value;

    const consentimento_termos = document.getElementById("termoUso").checked ? 1 : 0;
    const consentimento_imagem = document.getElementById("termoImagem").checked ? 1 : 0;

    const msgDiv = document.getElementById("mensagemCadastro");
    const submitBtn = document.getElementById("btnSubmitCadastro");
    const originalBtnHTML = submitBtn ? submitBtn.innerHTML : "Finalizar Cadastro";

    // Validação de WhatsApp / Telefone
    if (ddi === "+55") {
      if (apenasDigitos.length !== 11) {
        msgDiv.innerHTML = `<div class="alert alert-danger py-2 mb-0"><i class="bi bi-exclamation-circle-fill me-1"></i> O WhatsApp deve conter o DDD e os 9 dígitos do celular (exatos 11 dígitos). Exemplo: (71) 93186-4000.</div>`;
        document.getElementById("telefone").focus();
        return;
      }
    } else if (apenasDigitos.length < 8 || apenasDigitos.length > 15) {
      msgDiv.innerHTML = `<div class="alert alert-danger py-2 mb-0"><i class="bi bi-exclamation-circle-fill me-1"></i> Por favor, informe um número internacional válido com código de área.</div>`;
      document.getElementById("telefone").focus();
      return;
    }

    const telefone = ddi === "+55" ? telefoneRaw : `${ddi} ${telefoneRaw}`;

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

// Máscara e Sincronização de País (DDI) com o Campo de WhatsApp
function initPhoneMask() {
  const telInput = document.getElementById("telefone");
  const ddiSelect = document.getElementById("ddiPais");

  if (!telInput) return;

  function formatBRPhone(value) {
    let digits = value.replace(/\D/g, "");
    if (digits.length === 0) return { formatted: "", digits: "" };
    if (digits.length > 11) digits = digits.substring(0, 11);

    let formatted = "";
    if (digits.length === 1) {
      formatted = "(" + digits;
    } else if (digits.length === 2) {
      formatted = "(" + digits + ") ";
    } else if (digits.length > 2 && digits.length <= 7) {
      formatted = "(" + digits.substring(0, 2) + ") " + digits.substring(2);
    } else if (digits.length > 7) {
      formatted = "(" + digits.substring(0, 2) + ") " + digits.substring(2, 7) + "-" + digits.substring(7, 11);
    }

    return { formatted, digits };
  }

  function formatUSPhone(value) {
    let digits = value.replace(/\D/g, "");
    if (digits.length === 0) return { formatted: "", digits: "" };
    if (digits.length > 10) digits = digits.substring(0, 10);

    let formatted = "";
    if (digits.length > 0) formatted = "(" + digits.substring(0, 3);
    if (digits.length >= 3) formatted += ") ";
    if (digits.length >= 4) formatted += digits.substring(3, 6);
    if (digits.length >= 7) formatted += "-" + digits.substring(6, 10);
    return { formatted, digits };
  }

  // Adapta o campo quando o País (DDI) for alterado
  if (ddiSelect) {
    ddiSelect.addEventListener("change", () => {
      telInput.value = "";
      const ddi = ddiSelect.value;
      if (ddi === "+55") {
        telInput.placeholder = "(DDD) 9XXXX-XXXX";
        telInput.maxLength = 15;
      } else if (ddi === "+1") {
        telInput.placeholder = "(555) 000-0000";
        telInput.maxLength = 14;
      } else {
        telInput.placeholder = "Número de telefone";
        telInput.maxLength = 16;
      }
      telInput.focus();
    });
  }

  telInput.addEventListener("input", () => {
    const ddi = ddiSelect ? ddiSelect.value : "+55";
    if (ddi === "+55") {
      const { formatted } = formatBRPhone(telInput.value);
      telInput.value = formatted;
    } else if (ddi === "+1") {
      const { formatted } = formatUSPhone(telInput.value);
      telInput.value = formatted;
    } else {
      let digits = telInput.value.replace(/[^\d\s]/g, "");
      if (digits.length > 15) digits = digits.substring(0, 15);
      telInput.value = digits;
    }
  });

  if (telInput.value) {
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
});

// ===================================================
// 6. GOOGLE IDENTITY SERVICES (GIS / OAUTH 2.0)
// ===================================================
const GOOGLE_CLIENT_ID = '829544077365-15gti2p3tijsp20fqlcrt3r98cv1820u.apps.googleusercontent.com';
let activeGoogleCredential = null;

function renderGoogleComplementoModal() {
  let modalEl = document.getElementById("modalGoogleComplemento");
  if (modalEl) return modalEl;

  const modalHtml = `
    <div class="modal fade" id="modalGoogleComplemento" tabindex="-1" aria-labelledby="modalGoogleComplementoLabel" aria-hidden="true" data-bs-backdrop="static" data-bs-keyboard="false">
      <div class="modal-dialog modal-dialog-centered">
        <div class="modal-content modal-content-custom border-0 shadow-lg" style="border-radius: 20px; overflow: hidden;">
          <div class="modal-header modal-header-custom border-0 pb-0 pt-4 px-4 position-relative">
            <div class="d-flex align-items-center gap-3">
              <div id="googleUserAvatarWrap" class="rounded-circle overflow-hidden shadow-sm d-flex align-items-center justify-content-center bg-primary bg-opacity-10" style="width: 48px; height: 48px; border: 2px solid var(--senac-orange, #f28b00); flex-shrink: 0;">
                <i class="bi bi-person-circle fs-3 text-primary" id="googleUserIconFallback"></i>
                <img id="googleUserAvatarImg" src="" alt="Google Avatar" class="d-none w-100 h-100 object-fit-cover">
              </div>
              <div>
                <h5 class="modal-title fw-bold mb-0 font-heading" id="modalGoogleComplementoLabel" style="font-size: 1.15rem;">
                  <i class="bi bi-google text-primary me-1"></i> Concluir Cadastro
                </h5>
                <small class="text-muted d-block text-truncate" id="googleUserEmailLabel" style="max-width: 240px; font-size: 0.82rem;">Google</small>
              </div>
            </div>
            <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Fechar"><i class="bi bi-x-lg"></i></button>
          </div>

          <div class="modal-body modal-body-custom px-4 py-3">
            <p class="small text-muted mb-3">
              Para validar seus agendamentos práticos e receber lembretes no WhatsApp das aulas do SENAC, informe seu contato e confirme os termos legais:
            </p>

            <form id="formGoogleComplemento" novalidate>
              <!-- Telefone WhatsApp com DDI -->
              <div class="mb-3">
                <label class="form-label small fw-bold mb-1" for="telGoogleComplemento">
                  <i class="bi bi-whatsapp text-success me-1"></i> Número de WhatsApp <span class="text-danger">*</span>
                </label>
                <div class="input-group">
                  <div class="form-floating" style="max-width: 82px; flex-shrink: 0;">
                    <select class="form-select px-2 text-center" id="ddiGoogleComplemento" aria-label="DDI" style="font-size: 0.9rem;">
                      <option value="+55" selected>+55</option>
                      <option value="+1">+1</option>
                      <option value="+351">+351</option>
                      <option value="+34">+34</option>
                      <option value="+54">+54</option>
                      <option value="+44">+44</option>
                      <option value="+33">+33</option>
                      <option value="+49">+49</option>
                      <option value="+39">+39</option>
                      <option value="+598">+598</option>
                      <option value="+595">+595</option>
                      <option value="+81">+81</option>
                    </select>
                    <label for="ddiGoogleComplemento" class="px-2">DDI</label>
                  </div>
                  <div class="form-floating flex-grow-1">
                    <input 
                      type="tel" 
                      class="form-control" 
                      id="telGoogleComplemento" 
                      placeholder="(DDD) 9XXXX-XXXX" 
                      required 
                      maxlength="15"
                      autocomplete="tel"
                      aria-label="WhatsApp"
                    >
                    <label for="telGoogleComplemento"><i class="bi bi-phone me-1"></i> (DDD) 9XXXX-XXXX</label>
                  </div>
                </div>
              </div>

              <!-- Termos LGPD e Uso de Imagem -->
              <div class="p-3 bg-light bg-opacity-75 rounded-3 mb-3 border">
                <div class="d-flex align-items-center gap-2 mb-2">
                  <span class="badge bg-primary text-white" style="font-size: 0.7rem;"><i class="bi bi-shield-shaded"></i> LGPD</span>
                  <strong class="small text-secondary">Termos Legais e Consentimentos</strong>
                </div>
                <div class="form-check mb-2">
                  <input class="form-check-input" type="checkbox" id="termoUsoGoogle" required>
                  <label class="form-check-label small" for="termoUsoGoogle">
                    Li e aceito os <a href="politica-de-privacidade.html" target="_blank" class="text-decoration-none fw-semibold">Termos de Uso</a> e a <a href="politica-de-privacidade.html" target="_blank" class="text-decoration-none fw-semibold">Política de Privacidade</a> do SENAC.*
                  </label>
                </div>
                <div class="form-check">
                  <input class="form-check-input" type="checkbox" id="termoImagemGoogle">
                  <label class="form-check-label small text-muted" for="termoImagemGoogle">
                    Autorizo o uso de imagens dos procedimentos para fins acadêmicos e portfólio da turma (Opcional).
                  </label>
                </div>
              </div>

              <div id="msgErroGoogleComplemento" class="alert alert-danger d-none small py-2 px-3 mb-3 rounded-3" role="alert"></div>

              <button type="submit" class="btn btn-brand w-100 py-3 fw-bold shadow-sm" id="btnSubmitGoogleComplemento">
                <i class="bi bi-check2-circle me-1"></i> Concluir Cadastro com o Google
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  `;

  document.body.insertAdjacentHTML('beforeend', modalHtml);
  modalEl = document.getElementById("modalGoogleComplemento");

  // Máscara e sincronização de telefone para o modal do Google
  const telInput = document.getElementById("telGoogleComplemento");
  const ddiSelect = document.getElementById("ddiGoogleComplemento");

  if (ddiSelect && telInput) {
    ddiSelect.addEventListener("change", () => {
      telInput.value = "";
      const ddi = ddiSelect.value;
      if (ddi === "+55") {
        telInput.placeholder = "(DDD) 9XXXX-XXXX";
        telInput.maxLength = 15;
      } else if (ddi === "+1") {
        telInput.placeholder = "(555) 000-0000";
        telInput.maxLength = 14;
      } else {
        telInput.placeholder = "Número de telefone";
        telInput.maxLength = 16;
      }
      telInput.focus();
    });

    telInput.addEventListener("input", () => {
      const ddi = ddiSelect.value;
      if (ddi === "+55") {
        let digits = telInput.value.replace(/\D/g, "");
        if (digits.length > 11) digits = digits.substring(0, 11);
        let formatted = "";
        if (digits.length === 1) formatted = "(" + digits;
        else if (digits.length === 2) formatted = "(" + digits + ") ";
        else if (digits.length > 2 && digits.length <= 7) formatted = "(" + digits.substring(0, 2) + ") " + digits.substring(2);
        else if (digits.length > 7) formatted = "(" + digits.substring(0, 2) + ") " + digits.substring(2, 7) + "-" + digits.substring(7, 11);
        telInput.value = formatted;
      } else if (ddi === "+1") {
        let digits = telInput.value.replace(/\D/g, "");
        if (digits.length > 10) digits = digits.substring(0, 10);
        let formatted = "";
        if (digits.length > 0) formatted = "(" + digits.substring(0, 3);
        if (digits.length >= 3) formatted += ") ";
        if (digits.length >= 4) formatted += digits.substring(3, 6);
        if (digits.length >= 7) formatted += "-" + digits.substring(6, 10);
        telInput.value = formatted;
      }
    });
  }

  // Envio do formulário complementar
  const formGoogle = document.getElementById("formGoogleComplemento");
  formGoogle.addEventListener("submit", async (e) => {
    e.preventDefault();

    const msgErr = document.getElementById("msgErroGoogleComplemento");
    const submitBtn = document.getElementById("btnSubmitGoogleComplemento");
    const telRaw = telInput.value.trim();
    const apenasDigitos = telRaw.replace(/\D/g, "");
    const ddi = ddiSelect ? ddiSelect.value : "+55";
    const termoUso = document.getElementById("termoUsoGoogle").checked;
    const termoImagem = document.getElementById("termoImagemGoogle").checked;

    if (msgErr) msgErr.classList.add("d-none");

    if (apenasDigitos.length < 10 || apenasDigitos.length > 11) {
      if (msgErr) {
        msgErr.innerHTML = '<i class="bi bi-exclamation-triangle-fill me-1"></i> Por favor, digite um número de WhatsApp válido com DDD (10 a 11 dígitos).';
        msgErr.classList.remove("d-none");
      }
      telInput.focus();
      return;
    }

    if (!termoUso) {
      if (msgErr) {
        msgErr.innerHTML = '<i class="bi bi-exclamation-triangle-fill me-1"></i> É obrigatório aceitar os Termos de Uso e a Política de Privacidade (LGPD).';
        msgErr.classList.remove("d-none");
      }
      return;
    }

    const telefoneFinal = ddi === "+55" ? telRaw : `${ddi} ${telRaw}`;

    try {
      if (submitBtn) {
        submitBtn.disabled = true;
        submitBtn.innerHTML = '<span class="spinner-border spinner-border-sm me-2" role="status"></span>Criando sua conta...';
      }

      const res = await fetch(`${API_URL}/auth/google`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          credential: activeGoogleCredential,
          telefone: telefoneFinal,
          consentimento_termos: termoUso,
          consentimento_imagem: termoImagem
        })
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.erro || "Erro ao finalizar cadastro via Google.");
      }

      // Sucesso!
      localStorage.setItem("token", data.token);
      localStorage.setItem("usuario", JSON.stringify(data.usuário));
      sessionStorage.setItem("usuarioLogado", JSON.stringify(data.usuário));

      if (typeof bootstrap !== "undefined" && bootstrap.Modal) {
        const bsModal = bootstrap.Modal.getInstance(modalEl);
        if (bsModal) bsModal.hide();
      }

      redirectAfterAuthentication(data.usuário);

    } catch (err) {
      console.error("Erro ao concluir cadastro Google:", err);
      if (msgErr) {
        msgErr.innerHTML = `<i class="bi bi-exclamation-triangle-fill me-1"></i> ${err.message || "Falha ao concluir cadastro."}`;
        msgErr.classList.remove("d-none");
      }
      if (submitBtn) {
        submitBtn.disabled = false;
        submitBtn.innerHTML = '<i class="bi bi-check2-circle me-1"></i> Concluir Cadastro com o Google';
      }
    }
  });

  return modalEl;
}

window.handleGoogleCredentialResponse = async function(response) {
  if (!response || !response.credential) {
    console.error('Resposta do Google sem credencial válida.');
    return;
  }

  activeGoogleCredential = response.credential;

  const msgDiv = document.getElementById("mensagemErro") || document.getElementById("mensagemCadastro");
  if (msgDiv) {
    msgDiv.classList.remove("d-none", "alert-danger", "alert-warning");
    msgDiv.classList.add("alert", "alert-info");
    msgDiv.innerHTML = '<span class="spinner-border spinner-border-sm me-2" role="status"></span> Validando autenticação com o Google...';
  }

  try {
    const res = await fetch(`${API_URL}/auth/google`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ credential: response.credential })
    });

    const data = await res.json();

    if (!res.ok) {
      throw new Error(data.erro || 'Falha ao autenticar com a conta Google.');
    }

    // Se o usuário for novo, abrir modal para coletar WhatsApp e consentimentos LGPD/Imagem
    if (data.precisa_completar_cadastro) {
      if (msgDiv) msgDiv.classList.add("d-none");

      const modalEl = renderGoogleComplementoModal();
      const emailLabel = document.getElementById("googleUserEmailLabel");
      const avatarImg = document.getElementById("googleUserAvatarImg");
      const iconFallback = document.getElementById("googleUserIconFallback");
      const msgErr = document.getElementById("msgErroGoogleComplemento");
      const telInput = document.getElementById("telGoogleComplemento");
      const termoUso = document.getElementById("termoUsoGoogle");
      const termoImagem = document.getElementById("termoImagemGoogle");

      if (emailLabel) emailLabel.textContent = `${data.nome} (${data.email})`;
      if (data.foto_url && avatarImg) {
        avatarImg.src = data.foto_url;
        avatarImg.classList.remove("d-none");
        if (iconFallback) iconFallback.classList.add("d-none");
      } else if (iconFallback && avatarImg) {
        avatarImg.classList.add("d-none");
        iconFallback.classList.remove("d-none");
      }

      if (msgErr) msgErr.classList.add("d-none");
      if (telInput) telInput.value = "";
      if (termoUso) termoUso.checked = false;
      if (termoImagem) termoImagem.checked = false;

      if (typeof bootstrap !== "undefined" && bootstrap.Modal) {
        const bsModal = bootstrap.Modal.getOrCreateInstance(modalEl);
        bsModal.show();
      }
      return;
    }

    // Login imediato para usuário existente
    localStorage.setItem("token", data.token);
    localStorage.setItem("usuario", JSON.stringify(data.usuário));
    sessionStorage.setItem("usuarioLogado", JSON.stringify(data.usuário));

    if (msgDiv) {
      msgDiv.classList.remove("alert-info", "alert-danger");
      msgDiv.classList.add("alert", "alert-success");
      msgDiv.innerHTML = '<i class="bi bi-check-circle-fill me-2"></i> Autenticado com sucesso! Redirecionando...';
    }

    setTimeout(() => {
      redirectAfterAuthentication(data.usuário);
    }, 400);

  } catch (error) {
    console.error("Erro no login com o Google:", error);
    if (msgDiv) {
      msgDiv.classList.remove("alert-info", "alert-success", "d-none");
      msgDiv.classList.add("alert", "alert-danger");
      msgDiv.textContent = error.message || "Erro ao conectar com sua conta Google.";
    }
  }
};

function initGoogleAuth() {
  if (typeof google !== 'undefined' && google.accounts && google.accounts.id) {
    try {
      google.accounts.id.initialize({
        client_id: GOOGLE_CLIENT_ID,
        callback: window.handleGoogleCredentialResponse,
        auto_select: false,
        cancel_on_tap_outside: true
      });

      // Renderiza botões com a identidade visual apropriada
      const gButtons = document.querySelectorAll('.g_id_signin');
      const isDark = (localStorage.getItem('themeMode') || localStorage.getItem('theme')) === 'dark' ||
                     document.documentElement.getAttribute('data-theme') === 'dark';

      gButtons.forEach(btnContainer => {
        google.accounts.id.renderButton(btnContainer, {
          theme: isDark ? 'filled_blue' : 'outline',
          size: 'large',
          text: btnContainer.getAttribute('data-text') || 'sign_in_with',
          shape: 'rectangular',
          width: Math.min(360, window.innerWidth - 48),
          locale: 'pt-BR'
        });
      });
    } catch (e) {
      console.warn('Google Identity initialization error:', e);
    }
  } else {
    setTimeout(initGoogleAuth, 300);
  }
}

// Inicia o Google Identity Services ao carregar a página
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initGoogleAuth);
} else {
  initGoogleAuth();
}
window.addEventListener('load', initGoogleAuth);
