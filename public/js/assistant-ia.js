// public/js/assistant-ia.js - Assistente Virtual Inteligente Connect Senac (SENAC AI)

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
    },
    {
      keywords: ['alergia', 'restricoes', 'gravida', 'gestante', 'quimica'],
      response: 'No momento do agendamento, informe qualquer restrição ou alergia no campo de observações. Para gestantes e peles sensibilizadas, consulte previamente as orientações no card do curso.'
    }
  ];

  function getAiResponse(userMessage) {
    const cleanMsg = userMessage.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
    
    for (const item of knowledgeBase) {
      if (item.keywords.some(kw => cleanMsg.includes(kw))) {
        return item.response;
      }
    }

    return `Olá! Sou o assistente virtual do Connect Senac. Posso te ajudar com dúvidas sobre:
    <ul>
      <li>Como agendar ou ser modelo voluntário</li>
      <li>Atendimentos 100% gratuitos</li>
      <li>Localização da unidade SENAC</li>
      <li>Regras de cancelamento e antecedência</li>
      <li>Horas complementares / declaração</li>
    </ul>
    Você também pode falar com a nossa coordenação pelo botão do WhatsApp!`;
  }

  function injectAssistantUI() {
    if (document.getElementById('senac-ai-container')) return;

    const container = document.createElement('div');
    container.id = 'senac-ai-container';
    container.innerHTML = `
      <!-- Botão Flutuante da I.A. -->
      <button id="btnAiToggle" class="senac-ai-fab" title="Assistente Virtual SENAC AI" aria-label="Abrir Assistente Virtual">
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
              <small class="text-white-50" style="font-size: 0.75rem;">Assistente Inteligente</small>
            </div>
          </div>
          <button id="btnAiClose" class="btn-close btn-close-white" aria-label="Fechar"></button>
        </div>

        <div class="senac-ai-body" id="senacAiMessages">
          <div class="senac-ai-msg bot">
            <span>Olá! 👋 Sou a Inteligência Artificial do Connect Senac. Como posso te ajudar hoje?</span>
          </div>
          <div class="senac-ai-chips">
            <button class="ai-chip" data-query="É gratuito?">É gratuito?</button>
            <button class="ai-chip" data-query="Como ser modelo?">Como ser modelo?</button>
            <button class="ai-chip" data-query="Como cancelar?">Como cancelar?</button>
            <button class="ai-chip" data-query="Onde fica?">Onde fica?</button>
          </div>
        </div>

        <form id="senacAiForm" class="senac-ai-footer">
          <input type="text" id="senacAiInput" placeholder="Digite sua dúvida..." autocomplete="off" required>
          <button type="submit" class="btn-ai-send" aria-label="Enviar"><i class="bi bi-send-fill"></i></button>
        </form>
      </div>
    `;

    document.body.appendChild(container);

    const btnToggle = document.getElementById('btnAiToggle');
    const chatWindow = document.getElementById('senacAiChatWindow');
    const btnClose = document.getElementById('btnAiClose');
    const form = document.getElementById('senacAiForm');
    const input = document.getElementById('senacAiInput');
    const msgBox = document.getElementById('senacAiMessages');

    btnToggle.addEventListener('click', () => {
      chatWindow.classList.toggle('d-none');
      if (!chatWindow.classList.contains('d-none')) {
        input.focus();
      }
    });

    btnClose.addEventListener('click', () => chatWindow.classList.add('d-none'));

    function appendMessage(text, sender) {
      const msgDiv = document.createElement('div');
      msgDiv.className = `senac-ai-msg ${sender}`;
      msgDiv.innerHTML = `<span>${text}</span>`;
      msgBox.appendChild(msgDiv);
      msgBox.scrollTop = msgBox.scrollHeight;
    }

    form.addEventListener('submit', (e) => {
      e.preventDefault();
      const text = input.value.trim();
      if (!text) return;

      appendMessage(text, 'user');
      input.value = '';

      // Simulação de processamento inteligente com delay natural
      setTimeout(() => {
        const reply = getAiResponse(text);
        appendMessage(reply, 'bot');
      }, 450);
    });

    msgBox.addEventListener('click', (e) => {
      const chip = e.target.closest('.ai-chip');
      if (!chip) return;
      const query = chip.getAttribute('data-query');
      input.value = query;
      form.dispatchEvent(new Event('submit'));
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', injectAssistantUI);
  } else {
    injectAssistantUI();
  }
})();
