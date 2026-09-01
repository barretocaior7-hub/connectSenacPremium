// public/js/whatsapp-widget.js - Botão Flutuante de Atendimento WhatsApp

(() => {
  'use strict';

  function injectWhatsAppWidget() {
    if (document.getElementById('whatsapp-floating-btn')) return;

    const zapBtn = document.createElement('a');
    zapBtn.id = 'whatsapp-floating-btn';
    zapBtn.className = 'whatsapp-floating-btn shadow-lg';
    zapBtn.href = 'https://wa.me/5575999999999?text=' + encodeURIComponent('Olá! Gostaria de tirar uma dúvida sobre os atendimentos e cursos do Connect Senac.');
    zapBtn.target = '_blank';
    zapBtn.rel = 'noopener noreferrer';
    zapBtn.title = 'Fale conosco no WhatsApp';
    zapBtn.setAttribute('aria-label', 'Atendimento direto via WhatsApp');
    zapBtn.innerHTML = `
      <i class="bi bi-whatsapp"></i>
      <span class="whatsapp-floating-label d-none d-md-inline">Falar no WhatsApp</span>
    `;

    document.body.appendChild(zapBtn);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', injectWhatsAppWidget);
  } else {
    injectWhatsAppWidget();
  }
})();
