// public/js/assistant-ia.js - Assistente Virtual Inteligente Connect Senac (Gemini 3.6 Flash)

(() => {
  'use strict';

  const knowledgeBase = [
    {
      keywords: ['gratis', 'pago', 'valor', 'preco', 'custa', 'pagar', 'gratuito'],
      response: 'Sim! Todos os atendimentos práticos no Connect Senac são <strong>100% gratuitos</strong>. Eles fazem parte das aulas práticas supervisionadas dos cursos de formação profissional.'
    },
    {
      keywords: ['como ser modelo', 'como funciona', 'participar', 'ser modelo', 'voluntario', 'inscrever'],
      response: 'Para ser modelo voluntário:<br>1. Escolha o serviço na vitrine de cursos.<br>2. Selecione o melhor dia e horário disponível.<br>3. Crie sua conta ou faça login.<br>4. Compareça com 15 minutos de antecedência ao SENAC no dia marcado!'
    },
    {
      keywords: ['onde fica', 'local', 'endereco', 'unidade', 'onde e', 'localizacao', 'chegar'],
      response: 'A unidade do SENAC fica em <strong>Santo Antônio de Jesus - BA</strong>. Ao agendar, o endereço detalhado e o link do Google Maps/Waze ficam disponíveis no seu painel.'
    },
    {
      keywords: ['cancelar', 'remarcar', 'desmarcar', 'imprevisto', 'falta'],
      response: 'Você pode cancelar seu agendamento diretamente no seu painel com até <strong>2 horas de antecedência</strong>. Assim, a vaga é liberada automaticamente para outro modelo na fila.'
    },
    {
      keywords: ['certificado', 'horas', 'horas complementares', 'declaracao', 'atestado', 'comprovante'],
      response: 'Sim! Ao comparecer e ter a presença confirmada pelo professor, você pode solicitar a declaração de participação como modelo voluntário para comprovação de horas complementares.'
    },
    {
      keywords: ['idade', 'menor', 'requisitos', 'documentos', 'rg'],
      response: 'Para a maioria dos procedimentos é necessário ter a partir de 16 ou 18 anos (menores de 18 anos devem estar acompanhados de responsável legal). Traga documento com foto no dia do atendimento.'
    }
  ];

  function getLocalFallback(userMessage) {
    const cleanMsg = userMessage.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");

    const foraDeContexto = /\b(codigo|calculadora|javascript|python|programa|script|jogo|receita|piada|funcao|algoritmo)\b/i.test(cleanMsg);
    if (foraDeContexto) {
      return `Desculpe, sou o assistente virtual exclusivo do Connect Senac e só posso responder sobre nossos agendamentos, serviços práticos e cursos para modelos voluntários. Como posso te ajudar com o seu agendamento hoje? 😊`;
    }

    for (const item of knowledgeBase) {
      if (item.keywords.some(kw => cleanMsg.includes(kw))) {
        return item.response;
      }
    }
    return `Olá! Sou o assistente virtual do Connect Senac. Posso te ajudar com dúvidas sobre atendimentos 100% gratuitos, como ser modelo voluntário, localização da unidade e regras de agendamento. Você também pode falar diretamente com nossa coordenação pelo botão do WhatsApp!`;
  }

  function formatMarkdown(text) {
    if (!text) return '';
    let escaped = String(text)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');

    // Negrito **texto**
    escaped = escaped.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');

    // Itálico *texto*
    escaped = escaped.replace(/\*(.*?)\*/g, '<em>$1</em>');

    // Listas com bullet (* item ou - item)
    escaped = escaped.replace(/(?:^|\n)[*-]\s+(.+)/g, '<br>• $1');

    // Quebras de linha duplas e simples
    escaped = escaped.replace(/\n\n+/g, '<br><br>').replace(/\n/g, '<br>');

    return escaped;
  }

  function injectAssistantUI() {
    if (document.getElementById('senac-ai-container')) return;

    const container = document.createElement('div');
    container.id = 'senac-ai-container';
    container.innerHTML = `
      <!-- Botão Flutuante da I.A. -->
      <button id="btnAiToggle" class="senac-ai-fab" title="Assistente Virtual SENAC AI (Gemini Flash Lite)" aria-label="Abrir Assistente Virtual">
        <i class="bi bi-robot"></i>
        <span class="senac-ai-fab-badge">IA</span>
      </button>

      <!-- Janela do Chat -->
      <div id="senacAiChatWindow" class="senac-ai-window d-none" role="dialog" aria-label="Chat com Assistente Virtual">
        <div class="senac-ai-header">
          <div class="d-flex align-items-center gap-2">
            <div class="senac-ai-avatar">
              <i class="bi bi-stars"></i>
            </div>
            <div>
              <strong class="d-block font-heading" style="font-size: 0.95rem;">Connect AI • SENAC</strong>
              <small class="text-white-50" style="font-size: 0.72rem;"><i class="bi bi-cpu me-1"></i>Gemini Flash Lite</small>
            </div>
          </div>
          <button id="btnAiClose" class="btn-close btn-close-white" aria-label="Fechar" title="Fechar Assistente"><i class="bi bi-x-lg"></i></button>
        </div>

        <div class="senac-ai-body" id="senacAiMessages">
          <div class="senac-ai-msg bot">
            <span>Olá! 👋 Sou a Inteligência Artificial do <strong>Connect Senac</strong> (alimentada pelo Gemini Flash Lite). Como posso te ajudar hoje?</span>
          </div>
          <div class="senac-ai-chips">
            <button class="ai-chip" data-query="É gratuito?">É gratuito?</button>
            <button class="ai-chip" data-query="Como ser modelo?">Como ser modelo?</button>
            <button class="ai-chip" data-query="Como cancelar?">Como cancelar?</button>
            <button class="ai-chip" data-query="Onde fica?">Onde fica?</button>
          </div>
        </div>

        <form id="senacAiForm" class="senac-ai-footer">
          <input type="text" id="senacAiInput" placeholder="Pergunte sobre os cursos ou agendamentos..." autocomplete="off" required>
          <button type="submit" id="btnAiSend" class="btn-ai-send" aria-label="Enviar"><i class="bi bi-send-fill"></i></button>
        </form>
      </div>
    `;

    document.body.appendChild(container);

    const btnToggle = document.getElementById('btnAiToggle');
    const chatWindow = document.getElementById('senacAiChatWindow');
    const btnClose = document.getElementById('btnAiClose');
    const form = document.getElementById('senacAiForm');
    const input = document.getElementById('senacAiInput');
    const btnSend = document.getElementById('btnAiSend');
    const msgBox = document.getElementById('senacAiMessages');

    let chatHistory = [];
    let isProcessing = false;

    btnToggle.addEventListener('click', () => {
      chatWindow.classList.toggle('d-none');
      if (!chatWindow.classList.contains('d-none')) {
        input.focus();
      }
    });

    btnClose.addEventListener('click', () => chatWindow.classList.add('d-none'));

    function appendMessage(content, sender, isHtml = false) {
      const msgDiv = document.createElement('div');
      msgDiv.className = `senac-ai-msg ${sender}`;
      msgDiv.innerHTML = isHtml ? `<span>${content}</span>` : `<span>${formatMarkdown(content)}</span>`;
      msgBox.appendChild(msgDiv);
      msgBox.scrollTop = msgBox.scrollHeight;
      return msgDiv;
    }

    function showTypingIndicator() {
      const typingDiv = document.createElement('div');
      typingDiv.className = 'senac-ai-msg bot senac-ai-typing';
      typingDiv.id = 'aiTypingIndicator';
      typingDiv.innerHTML = `
        <span class="dot"></span>
        <span class="dot"></span>
        <span class="dot"></span>
      `;
      msgBox.appendChild(typingDiv);
      msgBox.scrollTop = msgBox.scrollHeight;
      return typingDiv;
    }

    function removeTypingIndicator() {
      const typingEl = document.getElementById('aiTypingIndicator');
      if (typingEl) typingEl.remove();
    }

    async function handleUserSubmit(userText) {
      if (isProcessing) return;
      const text = userText.trim();
      if (!text) return;

      appendMessage(text, 'user');
      input.value = '';
      input.disabled = true;
      btnSend.disabled = true;
      isProcessing = true;

      const indicator = showTypingIndicator();

      try {
        const response = await fetch('/api/assistente/chat', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            mensagem: text,
            historico: chatHistory
          })
        });

        const data = await response.json();
        removeTypingIndicator();

        const botReply = data.resposta || getLocalFallback(text);
        appendMessage(botReply, 'bot');

        // Atualiza o histórico de conversação
        chatHistory.push({ role: 'user', text: text });
        chatHistory.push({ role: 'model', text: botReply });

        // Limita o histórico local a 10 interações
        if (chatHistory.length > 10) {
          chatHistory = chatHistory.slice(-10);
        }

      } catch (err) {
        console.warn('Falha na requisição Gemini, ativando resposta local:', err);
        removeTypingIndicator();
        const fallback = getLocalFallback(text);
        appendMessage(fallback, 'bot', true);
      } finally {
        input.disabled = false;
        btnSend.disabled = false;
        isProcessing = false;
        input.focus();
      }
    }

    form.addEventListener('submit', (e) => {
      e.preventDefault();
      handleUserSubmit(input.value);
    });

    msgBox.addEventListener('click', (e) => {
      const chip = e.target.closest('.ai-chip');
      if (!chip || isProcessing) return;
      const query = chip.getAttribute('data-query');
      handleUserSubmit(query);
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', injectAssistantUI);
  } else {
    injectAssistantUI();
  }
})();
