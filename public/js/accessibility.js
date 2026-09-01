/** accessibility.js – central module for accessibility utilities.
 * Provides: VLibras toggle, high-contrast, dark-mode, and TTS.
 */
function createBtn(id, iconClass, title, onClick) {
  const btn = document.createElement('button');
  btn.id = id;
  btn.className = 'btn btn-sm btn-outline-primary me-2';
  btn.title = title;
  btn.type = 'button';
  btn.innerHTML = <i class= ></i>;
  btn.addEventListener('click', onClick);
  return btn;
}
function initAccessibility() {
  const toolbar = document.createElement('div');
  toolbar.id = 'accessibility-toolbar';
  toolbar.style.position = 'fixed';
  toolbar.style.bottom = '20px';
  toolbar.style.right = '20px';
  toolbar.style.zIndex = '1050';
  toolbar.className = 'd-flex bg-light p-2 rounded shadow';
  const btnVlibras = createBtn('btn-vlibras', 'bi bi-translate', 'Ativar VLibras', toggleVLibras);
  const btnContrast = createBtn('btn-contrast', 'bi bi-eye', 'Alto Contraste', toggleContrast);
  const btnDark = createBtn('btn-dark', 'bi bi-moon', 'Modo Escuro', toggleDarkMode);
  const btnSpeak = createBtn('btn-speak', 'bi bi-volume-up', 'Ouvir página', speakPage);
  toolbar.appendChild(btnVlibras);
  toolbar.appendChild(btnContrast);
  toolbar.appendChild(btnDark);
  toolbar.appendChild(btnSpeak);
  document.body.appendChild(toolbar);
  const dark = localStorage.getItem('darkMode') === 'true';
  if (dark) document.body.classList.add('dark-mode');
  const contrast = localStorage.getItem('highContrast') === 'true';
  if (contrast) document.body.classList.add('high-contrast');
}
let vlibrasLoaded = false;
function toggleVLibras() {
  if (!vlibrasLoaded) {
    const script = document.createElement('script');
    script.src = 'https://vlibras.gov.br/app/vlibras-plugin.js';
    script.onload = () => { new window.VLibras.Widget('pt'); };
    document.body.appendChild(script);
    vlibrasLoaded = true;
    alert('VLibras ativado. Use o botão na página para traduzir.');
  } else {
    const widget = document.querySelector('#vlibras');
    if (widget) widget.style.display = widget.style.display === 'none' ? 'block' : 'none';
  }
}
function toggleContrast() {
  document.body.classList.toggle('high-contrast');
  const isOn = document.body.classList.contains('high-contrast');
  localStorage.setItem('highContrast', isOn);
}
function toggleDarkMode() {
  document.body.classList.toggle('dark-mode');
  const isOn = document.body.classList.contains('dark-mode');
  localStorage.setItem('darkMode', isOn);
}
function speakPage() {
  const utterance = new SpeechSynthesisUtterance();
  const texts = [];
  document.querySelectorAll('p, span, h1, h2, h3, h4, h5, h6, li, a, button').forEach(el => {
    const style = window.getComputedStyle(el);
    if (style.display !== 'none' && style.visibility !== 'hidden') {
      texts.push(el.innerText.trim());
    }
  });
  utterance.text = texts.filter(t => t).join('. ');
  speechSynthesis.speak(utterance);
}
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initAccessibility);
} else {
  initAccessibility();
}
