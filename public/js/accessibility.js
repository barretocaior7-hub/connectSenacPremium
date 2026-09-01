// public/js/accessibility.js
// Módulo Central de Acessibilidade: Alto Contraste, Tamanho de Fonte, Modo Escuro, VLibras e Leitor de Voz por Clique

(() => {
  'use strict';

  // Configurações de Escala de Fonte
  const FONT_CONFIG = {
    min: 90,        // 90% do tamanho base
    max: 150,       // 150% do tamanho base
    step: 10,       // Incremento de 10%
    default: 100,   // 100% (padrão)
    storageKey: 'connect_senac_font_size'
  };

  let currentFontSize = FONT_CONFIG.default;
  let isVoiceReaderActive = false;
  let currentHighlightedEl = null;

  // 1. Injeta a estrutura HTML oficial do VLibras
  function injectVLibrasStructure() {
    if (document.querySelector('[vw]')) return;

    const vlibrasContainer = document.createElement('div');
    vlibrasContainer.setAttribute('vw', '');
    vlibrasContainer.className = 'enabled';
    vlibrasContainer.innerHTML = `
      <div vw-access-button class="active" title="Acessibilidade em Libras" aria-label="Abrir VLibras"></div>
      <div vw-plugin-wrapper>
        <div class="vw-plugin-top-wrapper"></div>
      </div>
    `;
    document.body.appendChild(vlibrasContainer);

    if (!window.VLibras) {
      const script = document.createElement('script');
      script.src = 'https://vlibras.gov.br/app/vlibras-plugin.js';
      script.defer = true;
      script.onload = () => {
        if (window.VLibras && window.VLibras.Widget) {
          new window.VLibras.Widget('https://vlibras.gov.br/app');
        }
      };
      document.body.appendChild(script);
    } else if (window.VLibras && window.VLibras.Widget) {
      new window.VLibras.Widget('https://vlibras.gov.br/app');
    }
  }

  // 2. Manipulação de Tamanho da Fonte (Aumentar, Diminuir, Redefinir)
  function setFontSize(percent) {
    percent = Math.max(FONT_CONFIG.min, Math.min(FONT_CONFIG.max, percent));
    currentFontSize = percent;
    document.documentElement.style.fontSize = `${percent}%`;
    localStorage.setItem(FONT_CONFIG.storageKey, percent.toString());

    const btnReset = document.getElementById('btn-font-reset');
    if (btnReset) {
      btnReset.title = `Tamanho atual: ${percent}% (Clique para restaurar 100%)`;
      btnReset.setAttribute('aria-label', `Tamanho atual da fonte: ${percent}%. Clique para restaurar para o padrão 100%`);
    }
  }

  function increaseFontSize() {
    setFontSize(currentFontSize + FONT_CONFIG.step);
  }

  function decreaseFontSize() {
    setFontSize(currentFontSize - FONT_CONFIG.step);
  }

  function resetFontSize() {
    setFontSize(FONT_CONFIG.default);
  }

  // 3. Alternância entre Alto Contraste e Modo Escuro
  function toggleContrast(force) {
    document.body.classList.remove('dark-mode');

    if (typeof force === 'boolean') {
      document.body.classList.toggle('high-contrast', force);
    } else {
      document.body.classList.toggle('high-contrast');
    }

    const isContrast = document.body.classList.contains('high-contrast');
    localStorage.setItem('themeMode', isContrast ? 'contrast' : 'normal');

    const btnContrast = document.getElementById('btn-contrast');
    if (btnContrast) {
      btnContrast.classList.toggle('active', isContrast);
      btnContrast.setAttribute('aria-pressed', isContrast ? 'true' : 'false');
    }

    const btnDark = document.getElementById('btn-dark');
    if (btnDark) {
      btnDark.classList.remove('active');
      btnDark.setAttribute('aria-pressed', 'false');
    }
  }

  function toggleDarkMode(force) {
    document.body.classList.remove('high-contrast');

    if (typeof force === 'boolean') {
      document.body.classList.toggle('dark-mode', force);
    } else {
      document.body.classList.toggle('dark-mode');
    }

    const isDark = document.body.classList.contains('dark-mode');
    localStorage.setItem('themeMode', isDark ? 'dark' : 'normal');

    const btnDark = document.getElementById('btn-dark');
    if (btnDark) {
      btnDark.classList.toggle('active', isDark);
      btnDark.setAttribute('aria-pressed', isDark ? 'true' : 'false');
    }

    const btnContrast = document.getElementById('btn-contrast');
    if (btnContrast) {
      btnContrast.classList.remove('active');
      btnContrast.setAttribute('aria-pressed', 'false');
    }
  }

  // 4. Sintetizador de Voz por Clique (Click-to-Speak)
  function speakText(text, targetElement) {
    if (!('speechSynthesis' in window) || !text) return;

    window.speechSynthesis.cancel();

    if (currentHighlightedEl) {
      currentHighlightedEl.classList.remove('accessibility-speaking-highlight');
      currentHighlightedEl = null;
    }

    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = 'pt-BR';
    utterance.rate = 1.05;

    if (targetElement && targetElement !== document.body) {
      targetElement.classList.add('accessibility-speaking-highlight');
      currentHighlightedEl = targetElement;
    }

    utterance.onend = utterance.onerror = () => {
      if (currentHighlightedEl) {
        currentHighlightedEl.classList.remove('accessibility-speaking-highlight');
        currentHighlightedEl = null;
      }
    };

    window.speechSynthesis.speak(utterance);
  }

  function extractReadableText(el) {
    if (!el || el === document.body) return '';

    // 1. Textos acessíveis explícitos
    const ariaLabel = el.getAttribute('aria-label');
    if (ariaLabel) return ariaLabel.trim();

    // 2. Imagens com texto alternativo
    if (el.tagName === 'IMG') {
      return el.alt ? `Imagem: ${el.alt}` : el.title || 'Imagem';
    }

    // 3. Inputs, selects e textareas
    if (['INPUT', 'SELECT', 'TEXTAREA'].includes(el.tagName)) {
      const label = document.querySelector(`label[for="${el.id}"]`);
      const labelText = label ? label.innerText.trim() : '';
      const placeholder = el.placeholder ? `Campo ${el.placeholder}` : '';
      const value = el.value ? `Valor: ${el.value}` : '';
      return [labelText, placeholder, value].filter(Boolean).join('. ') || el.title || 'Campo de formulário';
    }

    // 4. Botões e links
    if (el.tagName === 'BUTTON' || el.closest('button')) {
      const btn = el.tagName === 'BUTTON' ? el : el.closest('button');
      return btn.getAttribute('aria-label') || btn.innerText.trim() || btn.title || 'Botão';
    }

    if (el.tagName === 'A' || el.closest('a')) {
      const link = el.tagName === 'A' ? el : el.closest('a');
      return link.getAttribute('aria-label') || link.innerText.trim() || link.title || 'Link';
    }

    // 5. Textos diretos de elementos de conteúdo
    const text = el.innerText || el.textContent;
    return text ? text.trim() : '';
  }

  function handleDocumentClick(e) {
    if (!isVoiceReaderActive) return;

    // Ignora cliques dentro da toolbar de acessibilidade e do VLibras
    if (e.target.closest('#accessibility-toolbar') || e.target.closest('[vw]')) {
      return;
    }

    const clickedEl = e.target;
    const textToSpeak = extractReadableText(clickedEl);

    if (textToSpeak) {
      speakText(textToSpeak, clickedEl);
    }
  }

  function toggleVoiceReader() {
    const btnSpeak = document.getElementById('btn-speak');

    if (!('speechSynthesis' in window)) {
      alert('Seu navegador não possui suporte para síntese de voz.');
      return;
    }

    isVoiceReaderActive = !isVoiceReaderActive;

    if (isVoiceReaderActive) {
      document.body.classList.add('accessibility-voice-reader-on');
      if (btnSpeak) {
        btnSpeak.classList.add('active');
        btnSpeak.setAttribute('aria-pressed', 'true');
        btnSpeak.title = 'Leitor de Voz por Clique Ativado (Clique em qualquer texto para ouvir. Clique aqui para desativar)';
      }
      speakText('Leitor de voz ativado. Clique em qualquer elemento para ouvir.');
    } else {
      document.body.classList.remove('accessibility-voice-reader-on');
      window.speechSynthesis.cancel();
      if (currentHighlightedEl) {
        currentHighlightedEl.classList.remove('accessibility-speaking-highlight');
        currentHighlightedEl = null;
      }
      if (btnSpeak) {
        btnSpeak.classList.remove('active');
        btnSpeak.setAttribute('aria-pressed', 'false');
        btnSpeak.title = 'Ativar Leitor de Voz por Clique (Alt + V)';
      }
    }
  }

  // 5. Fábrica de Botões de Acessibilidade
  function createBtn(id, iconClass, labelText, title, onClick) {
    const btn = document.createElement('button');
    btn.id = id;
    btn.className = 'accessibility-btn btn btn-sm';
    btn.title = title;
    btn.setAttribute('aria-label', title);
    btn.setAttribute('type', 'button');
    btn.setAttribute('aria-pressed', 'false');

    if (labelText) {
      btn.innerHTML = `<span class="accessibility-btn-label">${labelText}</span>`;
    } else {
      btn.innerHTML = `<i class="${iconClass}"></i>`;
    }

    btn.addEventListener('click', onClick);
    return btn;
  }

  // 6. Inicialização da Barra de Ferramentas Flutuante
  function initAccessibility() {
    if (document.getElementById('accessibility-toolbar')) return;

    injectVLibrasStructure();

    const toolbar = document.createElement('aside');
    toolbar.id = 'accessibility-toolbar';
    toolbar.setAttribute('role', 'region');
    toolbar.setAttribute('aria-label', 'Barra de Ferramentas de Acessibilidade');
    toolbar.className = 'accessibility-floating-bar';

    // Botões de Acessibilidade
    const btnContrast = createBtn('btn-contrast', 'bi bi-circle-half', '', 'Alternar Alto Contraste (Alt + C)', toggleContrast);
    const btnFontInc = createBtn('btn-font-inc', 'bi bi-plus-lg', 'A+', 'Aumentar Tamanho da Fonte (Alt + +)', increaseFontSize);
    const btnFontDec = createBtn('btn-font-dec', 'bi bi-dash-lg', 'A-', 'Diminuir Tamanho da Fonte (Alt + -)', decreaseFontSize);
    const btnFontReset = createBtn('btn-font-reset', 'bi bi-arrow-counterclockwise', 'A', 'Restaurar Tamanho da Fonte (Alt + 0)', resetFontSize);
    const btnDark = createBtn('btn-dark', 'bi bi-moon-stars-fill', '', 'Alternar Modo Escuro', toggleDarkMode);
    const btnSpeak = createBtn('btn-speak', 'bi bi-volume-up-fill', '', 'Ativar Leitor de Voz por Clique (Alt + V)', toggleVoiceReader);

    toolbar.appendChild(btnContrast);
    toolbar.appendChild(btnFontInc);
    toolbar.appendChild(btnFontDec);
    toolbar.appendChild(btnFontReset);
    toolbar.appendChild(btnDark);
    toolbar.appendChild(btnSpeak);

    document.body.appendChild(toolbar);

    // Event listener global para capturar o clique e falar apenas o elemento clicado
    document.addEventListener('click', handleDocumentClick, true);

    // Atalhos Globais de Teclado
    window.addEventListener('keydown', (e) => {
      if (['INPUT', 'TEXTAREA', 'SELECT'].includes(document.activeElement?.tagName)) return;

      if (e.altKey && (e.key === 'c' || e.key === 'C')) {
        e.preventDefault();
        toggleContrast();
      } else if (e.altKey && (e.key === '+' || e.key === '=')) {
        e.preventDefault();
        increaseFontSize();
      } else if (e.altKey && (e.key === '-' || e.key === '_')) {
        e.preventDefault();
        decreaseFontSize();
      } else if (e.altKey && (e.key === '0')) {
        e.preventDefault();
        resetFontSize();
      } else if (e.altKey && (e.key === 'v' || e.key === 'V')) {
        e.preventDefault();
        toggleVoiceReader();
      } else if (e.key === 'Escape' && isVoiceReaderActive) {
        toggleVoiceReader();
      }
    });

    // Restaura preferências persistidas
    const savedTheme = localStorage.getItem('themeMode');
    if (savedTheme === 'contrast') {
      toggleContrast(true);
    } else if (savedTheme === 'dark') {
      toggleDarkMode(true);
    }

    const savedFontSize = localStorage.getItem(FONT_CONFIG.storageKey);
    if (savedFontSize) {
      setFontSize(parseInt(savedFontSize, 10));
    }
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
