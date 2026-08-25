# [CONTEXTO PARA I.A.] Documentação Técnica - Connect Senac V2.0

## 1. Visão Geral do Projeto
* **Nome:** Connect Senac
* **Status:** V2.0 (Completo, Integrado e Pronto para Produção)
* **Objetivo:** Sistema de agendamento web responsivo para serviços práticos de cursos do SENAC (estética/beleza), voltado a otimizar a ocupação de vagas, automatizar a gestão de pautas para docentes/coordenação e mitigar o absenteísmo de modelos.
* **Ambiente de Hospedagem:** Render.com (Web Service único com Node.js/Express) + Supabase (PostgreSQL Gerenciado).

## 2. Stack Tecnológica
* **Back-end:** Node.js (v20+ LTS), Express.js (v5.x).
* **Banco de Dados:** Supabase (PostgreSQL via `@supabase/supabase-js`).
* **Front-end:** HTML5, CSS3, JavaScript (Vanilla - ES6+), Bootstrap 5 (via CDN).
* **Segurança:** Autenticação Stateless via `jsonwebtoken` (JWT), criptografia com `bcrypt`, e controle de acesso RBAC (*Role-Based Access Control*).
* **Agendador de Notificações:** `node-cron` com varreduras para lembretes de aula e cancelamentos preventivos.
* **Arquitetura:** Monolito unificado onde a API Express serve as rotas `/api/*` e o front-end estático via `express.static('frontend')`.

## 3. Estrutura de Diretórios
```text
connect-senac/
├── backend/
│   ├── config/
│   │   └── database.js (Instância Supabase Client com PostgreSQL)
│   ├── controllers/
│   │   ├── adminController.js (Gestão de utilizadores, moderação, colaboradores e pautas globais)
│   │   ├── agendamentoController.js (Criar, listar meus, cancelar com regra de 2h, override admin)
│   │   ├── cursoController.js (Vitrine pública, catálogo administrativo, criar, editar, arquivar)
│   │   ├── dashboardController.js (Cálculo de métricas e taxa de cancelamento em tempo real)
│   │   ├── disponibilidadeController.js (Criação de grades de horário e consulta por curso)
│   │   ├── feedbackController.js (Criação de avaliações, consulta por curso e histórico individual)
│   │   ├── profissionalController.js (Pauta de turmas do docente, confirmação de presença e faltas)
│   │   └── usuarioController.js (Login, registro LGPD, recuperação e redefinição de senha)
│   ├── cron/
│   │   └── notificador.js (Motor de notificações automáticas via cron)
│   ├── middlewares/
│   │   ├── authMiddleware.js (Validação Bearer JWT)
│   │   └── rbacMiddleware.js (Controle de perfis: candidato, profissional, coordenador, admin)
│   └── routes/
│       ├── adminRoutes.js (/api/admin)
│       ├── agendamentoRoutes.js (/api/agendamentos)
│       ├── cursoRoutes.js (/api/cursos)
│       ├── dashboardRoutes.js (/api/dashboard)
│       ├── disponibilidadeRoutes.js (/api/disponibilidades)
│       ├── feedbackRoutes.js (/api/feedbacks)
│       ├── profissionalRoutes.js (/api/profissional)
│       └── usuarioRoutes.js (/api/usuarios)
├── frontend/
│   ├── index.html (Login e roteamento por perfil)
│   ├── cadastro.html (Registro com consentimentos LGPD)
│   ├── esqueci-senha.html (Solicitação de recuperação)
│   ├── redefinir-senha.html (Redefinição de senha com token)
│   ├── painel.html (Área do Candidato/Modelo: vitrine, agendamentos, avaliações)
│   ├── profissional.html (Área do Professor: pauta da turma, confirmação de presença, WhatsApp)
│   ├── admin.html (Admin Hub: métricas, catálogo, abertura de vagas, moderação, pautas globais)
│   └── js/
│       ├── auth.js (Auth, cadastro, recuperação de senha)
│       ├── painel.js (Lógica da área do candidato)
│       └── admin.js (Lógica administrativa e dashboards)
├── .env (PORT, SUPABASE_URL, SUPABASE_KEY, JWT_SECRET)
├── server.js (Ponto de entrada do sistema)
└── package.json
```

## 4. Regras de Negócio e Segurança Ativas
1. **RBAC (Controle por Perfis):**
   * `candidato`: Acesso à vitrine, agendamento de vagas, cancelamento próprio (>2h) e avaliações.
   * `profissional`: Acesso exclusivo às suas turmas, alunos agendados, confirmação de presença e contato via WhatsApp.
   * `coordenador`: Gestão de cursos, abertura de vagas, visualização de pautas globais e moderação de candidatos.
   * `admin`: Permissão irrestrita (criação de colaboradores, exclusão/bloqueio de contas, alteração de cargos).
2. **LGPD no Cadastro:** Consentimento de termos obrigatório e consentimento de uso de imagem opcional.
3. **Controle de Vagas e Overbooking:** Bloqueio atômico de duplicidade por usuário/horário e controle de `vagas_ocupadas` vs `vagas_totais`.
4. **Regra de Cancelamento:** Candidatos só podem cancelar até 2 horas antes do horário marcado. Administradores possuem rota de cancelamento forçado (*override*).
5. **Feedbacks e Avaliações:** Apenas modelos com agendamento com status `concluido` podem avaliar (nota 1-5 e comentário opcional), com unicidade garantida no banco.
6. **Autenticação Segura:** Sessões gerenciadas via JWT no `localStorage`, com auto-logout e redirecionamento na expiração (401).

---

Contexto Connect Senac V2.0 atualizado e consolidado com sucesso!