// public/js/accessibility.js
// Módulo Central de Acessibilidade: VLibras, Alto Contraste, Modo Escuro e TTS

(() => {
  'use strict';

  // 1. Injeta a estrutura HTML obrigatória do VLibras no DOM
  function injectVLibrasStructure() {
    if (document.querySelector('[vw]')) return;

    const vlibrasContainer = document.createElement('div');
    vlibrasContainer.setAttribute('vw', '');
    vlibrasContainer.className = 'enabled';
    vlibrasContainer.innerHTML = `
      <div vw-access-button class="active"></div>
      <div vw-plugin-wrapper>
        <div class="vw-plugin-top-wrapper"></div>
      </div>
    `;
    document.body.appendChild(vlibrasContainer);

    // Carrega o script oficial da CDN do Governo Federal e inicializa com a URL correta
    if (!window.VLibras) {
      const script = document.createElement('script');
      script.src = 'https://vlibras.gov.br/app/vlibras-plugin.js';
      script.onload = () => {
        if (window.VLibras && window.VLibras.Widget) {
          new window.VLibras.Widget('https://vlibras.gov.br/app');
        }
      };
      document.body.appendChild(script);
    } else {
      new window.VLibras.Widget('https://vlibras.gov.br/app');
    }
  }

  // 2. Criação da Barra de Ferramentas de Acessibilidade (Dark mode, Contraste, Voz)
  function createBtn(id, iconClass, title, onClick) {
    const btn = document.createElement('button');
    btn.id = id;
    btn.className = 'btn btn-sm btn-outline-primary me-1';
    btn.title = title;
    btn.type = 'button';
    btn.innerHTML = `<i class="${iconClass}"></i>`;
    btn.addEventListener('click', onClick);
    return btn;
  }

  function initAccessibility() {
    if (document.getElementById('accessibility-toolbar')) return;

    // 1. Inicia o VLibras automaticamente com a estrutura correta
    injectVLibrasStructure();

    // 2. Monta a Toolbar Flutuante
    const toolbar = document.createElement('div');
    toolbar.id = 'accessibility-toolbar';
    toolbar.style.position = 'fixed';
    toolbar.style.bottom = '20px';
    toolbar.style.left = '20px'; // Posicionado à esquerda para não colidir com o botão do VLibras à direita
    toolbar.style.zIndex = '1050';
    toolbar.className = 'd-flex bg-white p-2 rounded-pill shadow border';

    const btnContrast = createBtn('btn-contrast', 'bi bi-circle-half', 'Alto Contraste', toggleContrast);
    const btnDark = createBtn('btn-dark', 'bi bi-moon-stars-fill', 'Modo Escuro', toggleDarkMode);
    const btnSpeak = createBtn('btn-speak', 'bi bi-volume-up-fill', 'Ouvir Página', toggleSpeakPage);

    toolbar.appendChild(btnDark);
    toolbar.appendChild(btnContrast);
    toolbar.appendChild(btnSpeak);
    document.body.appendChild(toolbar);

    // Restaura preferências salvas
    if (localStorage.getItem('themeMode') === 'dark') toggleDarkMode(true);
    if (localStorage.getItem('themeMode') === 'contrast') toggleContrast(true);
  }

  // 3. Alternância mútua entre Modo Escuro e Alto Contraste
  function toggleDarkMode(force) {
    document.body.classList.remove('high-contrast');
    if (force === true) {
      document.body.classList.add('dark-mode');
    } else {
      document.body.classList.toggle('dark-mode');
    }
    const isDark = document.body.classList.contains('dark-mode');
    localStorage.setItem('themeMode', isDark ? 'dark' : 'normal');
  }

  function toggleContrast(force) {
    document.body.classList.remove('dark-mode');
    if (force === true) {
      document.body.classList.add('high-contrast');
    } else {
      document.body.classList.toggle('high-contrast');
    }
    const isContrast = document.body.classList.contains('high-contrast');
    localStorage.setItem('themeMode', isContrast ? 'contrast' : 'normal');
  }

  // 4. Sintetizador de Voz (Text-to-Speech) com parada controlada
  let isSpeaking = false;
  function toggleSpeakPage() {
    const btnSpeak = document.getElementById('btn-speak');
    if (!('speechSynthesis' in window)) {
      alert('Seu navegador não possui suporte para síntese de voz.');
      return;
    }

    if (isSpeaking) {
      window.speechSynthesis.cancel();
      isSpeaking = false;
      if (btnSpeak) btnSpeak.innerHTML = '<i class="bi bi-volume-up-fill"></i>';
      return;
    }

    const selectedText = window.getSelection().toString().trim();
    const mainContent = document.querySelector('main') || document.body;
    const textToSpeak = selectedText || mainContent.innerText;

    if (!textToSpeak) return;

    const utterance = new SpeechSynthesisUtterance(textToSpeak);
    utterance.lang = 'pt-BR';
    utterance.rate = 1.0;

    utterance.onstart = () => {
      isSpeaking = true;
      if (btnSpeak) btnSpeak.innerHTML = '<i class="bi bi-stop-circle-fill text-danger"></i>';
    };

    utterance.onend = utterance.onerror = () => {
      isSpeaking = false;
      if (btnSpeak) btnSpeak.innerHTML = '<i class="bi bi-volume-up-fill"></i>';
    };

    window.speechSynthesis.cancel();
    window.speechSynthesis.speak(utterance);
  }

  window.addEventListener('beforeunload', () => {
    if ('speechSynthesis' in window) window.speechSynthesis.cancel();
  });

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initAccessibility);
  } else {
    initAccessibility();
  }
})();
