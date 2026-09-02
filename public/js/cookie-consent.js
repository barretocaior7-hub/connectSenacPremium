// public/js/cookie-consent.js - Gerenciador de Consentimento e Cookies (Conformidade LGPD)

(() => {
  'use strict';

  function injectCookieConsent() {
    if (localStorage.getItem('senac_cookie_consent')) return;
    if (document.getElementById('senac-cookie-banner')) return;

    const banner = document.createElement('aside');
    banner.id = 'senac-cookie-banner';
    banner.className = 'senac-cookie-banner shadow-lg';
    banner.setAttribute('role', 'dialog');
    banner.setAttribute('aria-label', 'Preferências de Cookies e Privacidade');
    banner.innerHTML = `
      <div class="container d-flex flex-column flex-md-row align-items-center justify-content-between gap-3 py-3">
        <div class="d-flex align-items-start gap-3">
          <div class="cookie-icon text-warning fs-3 mt-1"><i class="bi bi-shield-lock-fill"></i></div>
          <div>
            <strong class="d-block text-white font-heading" style="font-size: 0.95rem;">Respeitamos sua Privacidade e Dados (LGPD)</strong>
            <p class="text-white-50 small mb-0" style="max-width: 680px; font-size: 0.82rem;">
              Utilizamos cookies essenciais para autenticação segura e melhoria da sua experiência em nossos serviços práticos. Consulte nossa 
              <a href="#" id="linkAbrirPolitica" class="text-warning text-decoration-underline">Política de Privacidade</a> e 
              <a href="#" id="linkAbrirTermos" class="text-warning text-decoration-underline">Termos de Uso</a>.
            </p>
          </div>
        </div>
        <div class="d-flex align-items-center gap-2 flex-shrink-0 w-100 w-md-auto justify-content-end">
          <button id="btnCookiesEssenciais" class="btn btn-sm btn-outline-light px-3 py-1">Essenciais</button>
          <button id="btnCookiesTodos" class="btn btn-sm btn-warning text-dark fw-bold px-3 py-1">Aceitar Todos</button>
        </div>
      </div>
    `;

    // Modal de Termos & Privacidade LGPD
    const modalLGPD = document.createElement('div');
    modalLGPD.id = 'modalLGPDTerms';
    modalLGPD.className = 'modal fade';
    modalLGPD.tabIndex = -1;
    modalLGPD.innerHTML = `
      <div class="modal-dialog modal-dialog-scrollable modal-lg">
        <div class="modal-content">
          <div class="modal-header bg-senac-blue text-white">
            <h5 class="modal-title font-heading" id="modalLGPDTitle"><i class="bi bi-shield-check me-2"></i> Termos de Uso e LGPD</h5>
            <button type="button" class="btn-close btn-close-white" data-bs-dismiss="modal" aria-label="Fechar"><i class="bi bi-x-lg"></i></button>
          </div>
          <div class="modal-body text-secondary small p-4">
            <h6 class="fw-bold text-dark">1. Finalidade do Tratamento de Dados (Lei 13.709/2018 - LGPD)</h6>
            <p>O Connect Senac coleta dados cadastrais (nome, e-mail, telefone) estritamente para o gerenciamento de pautas, agendamento de modelos voluntários e comunicação institucional relativa às aulas práticas de cursos de formação profissional.</p>
            
            <h6 class="fw-bold text-dark mt-3">2. Modelo Voluntário e Isenção de Custos</h6>
            <p>Os atendimentos realizados pelos alunos são de caráter pedagógico, 100% gratuitos e supervisionados por docentes qualificados do SENAC. O modelo voluntário declara ciência de que os procedimentos são realizados por alunos em treinamento prático.</p>

            <h6 class="fw-bold text-dark mt-3">3. Uso de Imagem (Facultativo)</h6>
            <p>A cessão de imagem para fins acadêmicos e divulgação do portfólio da turma é opcional e pode ser revogada pelo titular a qualquer momento junto à coordenação.</p>

            <h6 class="fw-bold text-dark mt-3">4. Política de Cancelamento</h6>
            <p>O cancelamento pelo modelo deve ocorrer com no mínimo 2 horas de antecedência na plataforma para evitar prejuízo pedagógico às turmas práticas.</p>
          </div>
          <div class="modal-footer">
            <button type="button" class="btn btn-sm btn-primary" data-bs-dismiss="modal">Entendi e Concordo</button>
          </div>
        </div>
      </div>
    `;

    document.body.appendChild(banner);
    document.body.appendChild(modalLGPD);

    const modalInstance = typeof bootstrap !== 'undefined' ? new bootstrap.Modal(modalLGPD) : null;

    document.getElementById('btnCookiesTodos').addEventListener('click', () => {
      localStorage.setItem('senac_cookie_consent', 'all');
      banner.remove();
    });

    document.getElementById('btnCookiesEssenciais').addEventListener('click', () => {
      localStorage.setItem('senac_cookie_consent', 'essential');
      banner.remove();
    });

    document.getElementById('linkAbrirPolitica').addEventListener('click', (e) => {
      e.preventDefault();
      if (modalInstance) modalInstance.show();
    });

    document.getElementById('linkAbrirTermos').addEventListener('click', (e) => {
      e.preventDefault();
      if (modalInstance) modalInstance.show();
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', injectCookieConsent);
  } else {
    injectCookieConsent();
  }
})();
