// backend/controllers/assistenteController.js
const SYSTEM_INSTRUCTION = `Você é o Connect AI, o assistente virtual inteligente e oficial da plataforma Connect Senac (unidade Santo Antônio de Jesus - BA).
Sua missão é ajudar candidatos a modelos voluntários, alunos e o público em geral com dúvidas sobre os cursos e agendamentos práticos.

Diretrizes obrigatórias:
1. **Atendimentos 100% Gratuitos**: Esclareça que todos os atendimentos práticos no Connect Senac são totalmente gratuitos, pois fazem parte das aulas práticas supervisionadas dos cursos profissionalizantes (estética, beleza, etc.).
2. **Como Participar como Modelo**: Para ser modelo voluntário, a pessoa escolhe o serviço na vitrine do site, seleciona um horário disponível e confirma o agendamento após criar uma conta ou fazer login.
3. **Localização**: A unidade do SENAC fica em Santo Antônio de Jesus - BA. O endereço e detalhes ficam disponíveis no painel ao agendar.
4. **Horas Complementares**: Modelos participantes podem solicitar declaração de presença com o professor para comprovação de horas complementares.
5. **Cancelamentos**: O cancelamento de vagas pode ser feito diretamente no painel do usuário com pelo menos 2 horas de antecedência.
6. **Requisitos**: É necessário ter a partir de 16 ou 18 anos (menores acompanhados de responsável) e portar documento com foto no dia do atendimento.
7. **Suporte Humano**: Caso a dúvida seja muito específica, informe que a coordenação pode ser contatada pelo botão do WhatsApp disponível na tela.
8. **Tom de voz**: Seja caloroso, simpático, conciso, profissional e prestativo em português do Brasil. Use emojis com moderação para tornar a conversa agradável e use quebras de linha para boa leitura.`;

exports.conversar = async (req, res) => {
    try {
        const { mensagem, historico } = req.body;

        if (!mensagem || typeof mensagem !== 'string' || !mensagem.trim()) {
            return res.status(400).json({ erro: 'Mensagem é obrigatória.' });
        }

        const apiKey = process.env.GEMINI_API_KEY;
        if (!apiKey) {
            console.warn('GEMINI_API_KEY não configurada no .env.');
            return res.json({
                resposta: 'Olá! Sou o assistente do Connect Senac. Estou operando temporariamente em modo offline. Você pode agendar atendimentos 100% gratuitos pelo nosso painel ou falar com nossa coordenação pelo WhatsApp!'
            });
        }

        // Monta o histórico de mensagens
        const contents = [];

        if (Array.isArray(historico)) {
            historico.slice(-8).forEach(item => {
                if (item && item.text && (item.role === 'user' || item.role === 'model')) {
                    contents.push({
                        role: item.role,
                        parts: [{ text: String(item.text).slice(0, 1000) }]
                    });
                }
            });
        }

        // Adiciona a mensagem atual do usuário
        contents.push({
            role: 'user',
            parts: [{ text: mensagem.trim().slice(0, 1000) }]
        });

        const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/gemini-3.6-flash:generateContent?key=${apiKey}`;

        const payload = {
            system_instruction: {
                parts: [{ text: SYSTEM_INSTRUCTION }]
            },
            contents,
            generationConfig: {
                temperature: 0.7,
                maxOutputTokens: 1500
            }
        };

        let data = null;
        let lastError = null;

        // Executa até 3 tentativas para mitigar picos de demanda temporários (503) da API
        for (let attempt = 1; attempt <= 3; attempt++) {
            try {
                const response = await fetch(endpoint, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(payload)
                });

                data = await response.json();

                if (response.ok && data.candidates && data.candidates.length > 0) {
                    lastError = null;
                    break;
                }

                // Se recebeu 503 (alta demanda temporária), aguarda e tenta novamente
                if (response.status === 503 || data.error?.code === 503) {
                    lastError = data.error?.message || '503 High Demand';
                    if (attempt < 3) {
                        await new Promise(r => setTimeout(r, attempt * 600));
                        continue;
                    }
                } else {
                    lastError = data.error?.message || 'Erro na API Gemini';
                    break;
                }
            } catch (fetchErr) {
                lastError = fetchErr.message;
                if (attempt < 3) {
                    await new Promise(r => setTimeout(r, attempt * 600));
                }
            }
        }

        if (!data || !data.candidates || data.candidates.length === 0) {
            console.error('Falha ao obter resposta do Gemini 3.6 Flash:', lastError);
            return res.status(500).json({
                erro: 'Falha na comunicação com a IA.',
                resposta: 'Desculpe, tive uma oscilação momentânea na conexão com o Gemini. Pode repetir sua pergunta ou clicar no botão do WhatsApp para falar com nossa equipe?'
            });
        }

        const candidato = data.candidates?.[0];
        const parts = candidato?.content?.parts || [];
        const textoPartes = parts
            .filter(p => p.text && !p.thought)
            .map(p => p.text)
            .join('\n');

        const respostaTexto = textoPartes || parts[parts.length - 1]?.text || '';

        if (!respostaTexto) {
            return res.json({
                resposta: 'Não consegui formular uma resposta no momento. Pode tentar perguntar de outra forma?'
            });
        }

        res.json({
            resposta: respostaTexto.trim(),
            modelo: 'gemini-3.6-flash'
        });

    } catch (error) {
        console.error('Erro no controller do assistente Gemini:', error.message);
        res.status(500).json({
            erro: 'Erro interno ao processar conversa.',
            resposta: 'Ocorreu um imprevisto ao processar sua mensagem. Por favor, tente novamente em instantes.'
        });
    }
};
