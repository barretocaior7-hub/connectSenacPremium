/**
 * public/js/user-settings.js
 * Componente Global de Configurações da Conta - Connect Senac
 * Gerencia o modal de Informações Pessoais, Segurança (troca de senha) e Perfil com Agendamentos Ativos.
 */

(() => {
  'use strict';

  // Injeção do Modal de Configurações
  function injetarModalConfiguracoes() {
    if (document.getElementById('modalConfiguracoesConta')) return;

    const modalHtml = `
      <div class="modal fade" id="modalConfiguracoesConta" tabindex="-1" aria-labelledby="modalConfiguracoesContaLabel" aria-hidden="true">
        <div class="modal-dialog modal-dialog-centered modal-lg">
          <div class="modal-content modal-content-custom modal-settings-card">
            
            <!-- Cabeçalho do Modal -->
            <div class="modal-header modal-header-custom border-bottom pb-3">
              <div class="d-flex align-items-center gap-2">
                <div class="settings-header-icon">
                  <i class="bi bi-gear-fill"></i>
                </div>
                <div>
                  <h5 class="modal-title fw-bold font-heading mb-0" id="modalConfiguracoesContaLabel" style="color: var(--senac-blue);">Configurações da Conta</h5>
                  <small class="text-muted" style="font-size: 0.78rem;">Gerencie seus dados pessoais, credenciais de acesso e atividades</small>
                </div>
              </div>
              <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Fechar"><i class="bi bi-x-lg"></i></button>
            </div>

            <!-- Navegação por Abas -->
            <div class="settings-tabs-wrap border-bottom px-3 pt-2 bg-light-subtle">
              <ul class="nav nav-pills settings-nav-pills gap-2" id="settingsTabs" role="tablist">
                <li class="nav-item" role="presentation">
                  <button class="nav-link active" id="tab-pessoal-btn" data-bs-toggle="pill" data-bs-target="#tab-pessoal" type="button" role="tab" aria-controls="tab-pessoal" aria-selected="true">
                    <i class="bi bi-person-lines-fill me-1"></i> Dados Pessoais
                  </button>
                </li>
                <li class="nav-item" role="presentation">
                  <button class="nav-link" id="tab-seguranca-btn" data-bs-toggle="pill" data-bs-target="#tab-seguranca" type="button" role="tab" aria-controls="tab-seguranca" aria-selected="false">
                    <i class="bi bi-shield-lock-fill me-1"></i> Segurança
                  </button>
                </li>
                <li class="nav-item" role="presentation">
                  <button class="nav-link" id="tab-perfil-btn" data-bs-toggle="pill" data-bs-target="#tab-perfil" type="button" role="tab" aria-controls="tab-perfil" aria-selected="false">
                    <i class="bi bi-person-badge-fill me-1"></i> Perfil & Agendamentos
                  </button>
                </li>
              </ul>
            </div>

            <!-- Corpo do Modal / Conteúdo das Abas -->
            <div class="modal-body modal-body-custom p-4">
              
              <!-- Alerta de Feedback -->
              <div id="settingsAlert" class="alert d-none mb-3 py-2 px-3 small rounded-3" role="alert"></div>

              <div class="tab-content" id="settingsTabContent">
                
                <!-- ABA 1: DADOS PESSOAIS -->
                <div class="tab-pane fade show active" id="tab-pessoal" role="tabpanel" aria-labelledby="tab-pessoal-btn">
                  <form id="formDadosPessoais" novalidate>
                    <div class="mb-3">
                      <label for="cfgNome" class="form-label fw-semibold small text-dark">Nome Completo</label>
                      <div class="input-group">
                        <span class="input-group-text bg-light border-end-0"><i class="bi bi-person text-muted"></i></span>
                        <input type="text" class="form-control border-start-0 ps-0" id="cfgNome" placeholder="Seu nome completo" required>
                      </div>
                    </div>

                    <div class="mb-3">
                      <label for="cfgEmail" class="form-label fw-semibold small text-dark">Endereço de E-mail</label>
                      <div class="input-group">
                        <span class="input-group-text bg-light border-end-0"><i class="bi bi-envelope text-muted"></i></span>
                        <input type="email" class="form-control border-start-0 ps-0 bg-light" id="cfgEmail" readonly title="O e-mail principal não pode ser alterado diretamente">
                        <span class="input-group-text bg-light text-success small"><i class="bi bi-check-circle-fill me-1"></i> Verificado</span>
                      </div>
                      <small class="text-muted" style="font-size: 0.72rem;">O e-mail é a sua identificação única no SENAC.</small>
                    </div>

                    <div class="mb-4">
                      <label for="cfgTelefone" class="form-label fw-semibold small text-dark">WhatsApp / Telefone de Contato</label>
                      <div class="input-group">
                        <span class="input-group-text bg-light border-end-0"><i class="bi bi-whatsapp text-success"></i></span>
                        <input type="tel" class="form-control border-start-0 ps-0" id="cfgTelefone" placeholder="(75) 99999-9999" maxlength="15">
                      </div>
                      <small class="text-muted" style="font-size: 0.72rem;">Utilizado para avisos e confirmações da coordenação.</small>
                    </div>

                    <div class="d-flex justify-content-end gap-2 pt-2 border-top">
                      <button type="submit" class="btn btn-primary px-4 fw-semibold" id="btnSalvarDadosPessoais">
                        <span class="btn-text"><i class="bi bi-floppy-fill me-1"></i> Salvar Alterações</span>
                        <span class="spinner-border spinner-border-sm d-none" role="status" aria-hidden="true"></span>
                      </button>
                    </div>
                  </form>
                </div>

                <!-- ABA 2: SEGURANÇA (ALTERAR SENHA) -->
                <div class="tab-pane fade" id="tab-seguranca" role="tabpanel" aria-labelledby="tab-seguranca-btn">
                  <form id="formAlterarSenha" novalidate>
                    <div class="mb-3">
                      <label for="cfgSenhaAtual" class="form-label fw-semibold small text-dark">Senha Atual</label>
                      <div class="input-group">
                        <span class="input-group-text bg-light border-end-0"><i class="bi bi-key text-muted"></i></span>
                        <input type="password" class="form-control border-start-0 border-end-0 ps-0" id="cfgSenhaAtual" placeholder="Digite sua senha atual" required>
                        <button type="button" class="input-group-text bg-light text-muted border-start-0 btn-toggle-pass" data-target="cfgSenhaAtual">
                          <i class="bi bi-eye"></i>
                        </button>
                      </div>
                    </div>

                    <div class="mb-3">
                      <label for="cfgNovaSenha" class="form-label fw-semibold small text-dark">Nova Senha</label>
                      <div class="input-group">
                        <span class="input-group-text bg-light border-end-0"><i class="bi bi-lock text-muted"></i></span>
                        <input type="password" class="form-control border-start-0 border-end-0 ps-0" id="cfgNovaSenha" placeholder="Mínimo 6 caracteres" minlength="6" required>
                        <button type="button" class="input-group-text bg-light text-muted border-start-0 btn-toggle-pass" data-target="cfgNovaSenha">
                          <i class="bi bi-eye"></i>
                        </button>
                      </div>
                      <div class="password-strength-wrap mt-2">
                        <div class="password-strength-bar" id="cfgPassStrengthBar"></div>
                      </div>
                      <small class="text-muted d-block mt-1" id="cfgPassStrengthText" style="font-size: 0.72rem;">Use letras, números e caracteres especiais para maior proteção.</small>
                    </div>

                    <div class="mb-4">
                      <label for="cfgConfirmarSenha" class="form-label fw-semibold small text-dark">Confirmar Nova Senha</label>
                      <div class="input-group">
                        <span class="input-group-text bg-light border-end-0"><i class="bi bi-shield-check text-muted"></i></span>
                        <input type="password" class="form-control border-start-0 border-end-0 ps-0" id="cfgConfirmarSenha" placeholder="Repita a nova senha" minlength="6" required>
                        <button type="button" class="input-group-text bg-light text-muted border-start-0 btn-toggle-pass" data-target="cfgConfirmarSenha">
                          <i class="bi bi-eye"></i>
                        </button>
                      </div>
                    </div>

                    <div class="d-flex justify-content-end gap-2 pt-2 border-top">
                      <button type="submit" class="btn btn-warning text-dark px-4 fw-bold" id="btnSalvarSenha">
                        <span class="btn-text"><i class="bi bi-shield-check me-1"></i> Atualizar Senha</span>
                        <span class="spinner-border spinner-border-sm d-none" role="status" aria-hidden="true"></span>
                      </button>
                    </div>
                  </form>
                </div>

                <!-- ABA 3: PERFIL & AGENDAMENTOS ATIVOS -->
                <div class="tab-pane fade" id="tab-perfil" role="tabpanel" aria-labelledby="tab-perfil-btn">
                  
                  <!-- Card Resumo de Perfil -->
                  <div class="settings-profile-card p-3 rounded-3 mb-4 bg-light border">
                    <div class="d-flex align-items-center gap-3">
                      <div class="settings-profile-avatar" id="cfgPerfilAvatar">
                        <i class="bi bi-person-fill"></i>
                      </div>
                      <div class="overflow-hidden flex-grow-1">
                        <h6 class="fw-bold mb-1 text-truncate text-dark font-heading" id="cfgPerfilNome">Carregando...</h6>
                        <div class="text-muted small text-truncate mb-2" id="cfgPerfilEmail">usuario@email.com</div>
                        <div class="d-flex flex-wrap align-items-center gap-2">
                          <span class="badge bg-primary" id="cfgPerfilRoleBadge"><i class="bi bi-person-badge"></i> Candidato</span>
                          <span class="badge bg-success-subtle text-success border border-success-subtle" id="cfgPerfilLgpdBadge"><i class="bi bi-shield-check"></i> LGPD Ativo</span>
                          <span class="badge bg-info-subtle text-info-emphasis border border-info-subtle" id="cfgPerfilImagemBadge"><i class="bi bi-camera"></i> Imagem OK</span>
                        </div>
                      </div>
                    </div>
                    <div class="d-flex justify-content-between align-items-center mt-3 pt-2 border-top text-muted small" style="font-size: 0.74rem;">
                      <span><i class="bi bi-calendar-event me-1"></i> Membro desde: <strong id="cfgPerfilDataCriacao" class="text-dark">-</strong></span>
                      <span id="cfgPerfilStatusConta"><i class="bi bi-check-circle-fill text-success me-1"></i> Conta Ativa</span>
                    </div>
                  </div>

                  <!-- Seção de Agendamentos Ativos -->
                  <div>
                    <div class="d-flex justify-content-between align-items-center mb-3">
                      <h6 class="fw-bold mb-0 text-dark font-heading">
                        <i class="bi bi-calendar2-check-fill text-primary me-1"></i> Seus Agendamentos Ativos
                      </h6>
                      <button type="button" class="btn btn-sm btn-outline-secondary py-0 px-2" id="btnRecarregarAgendamentos" title="Atualizar lista">
                        <i class="bi bi-arrow-clockwise"></i> Atualizar
                      </button>
                    </div>

                    <div id="cfgListaAgendamentos" class="settings-appointments-list">
                      <div class="text-center py-4 text-muted small">
                        <div class="spinner-border spinner-border-sm text-primary me-2" role="status"></div>
                        Carregando seus agendamentos...
                      </div>
                    </div>
                  </div>

                </div>

              </div>

            </div>

          </div>
        </div>
      </div>
    `;

    document.body.insertAdjacentHTML('beforeend', modalHtml);
    configurarEventosModal();
  }

  // Máscara de Telefone Brasileira
  function aplicarMascaraTelefone(input) {
    if (!input) return;
    input.addEventListener('input', (e) => {
      let v = e.target.value.replace(/\D/g, '');
      if (v.length > 11) v = v.slice(0, 11);
      if (v.length > 10) {
        e.target.value = `(${v.slice(0, 2)}) ${v.slice(2, 7)}-${v.slice(7)}`;
      } else if (v.length > 6) {
        e.target.value = `(${v.slice(0, 2)}) ${v.slice(2, 6)}-${v.slice(6)}`;
      } else if (v.length > 2) {
        e.target.value = `(${v.slice(0, 2)}) ${v.slice(2)}`;
      } else if (v.length > 0) {
        e.target.value = `(${v}`;
      } else {
        e.target.value = '';
      }
    });
  }

  // Indicador de Força de Senha
  function calcularForcaSenha(senha) {
    let score = 0;
    if (!senha) return 0;
    if (senha.length >= 6) score += 25;
    if (senha.length >= 8) score += 15;
    if (/[A-Z]/.test(senha)) score += 20;
    if (/[0-9]/.test(senha)) score += 20;
    if (/[^A-Za-z0-9]/.test(senha)) score += 20;
    return Math.min(100, score);
  }

  // Exibir Alerta no Modal
  function mostrarAlerta(mensagem, tipo = 'success') {
    const alertBox = document.getElementById('settingsAlert');
    if (!alertBox) return;
    alertBox.className = `alert alert-${tipo} py-2 px-3 small rounded-3 mb-3`;
    alertBox.innerHTML = mensagem;
    alertBox.classList.remove('d-none');
    setTimeout(() => {
      alertBox.classList.add('d-none');
    }, 4500);
  }

  // Alternar Visibilidade da Senha
  function alternarOlhoSenha(btn) {
    const targetId = btn.getAttribute('data-target');
    const input = document.getElementById(targetId);
    if (!input) return;
    const icon = btn.querySelector('i');
    if (input.type === 'password') {
      input.type = 'text';
      if (icon) {
        icon.classList.remove('bi-eye');
        icon.classList.add('bi-eye-slash');
      }
    } else {
      input.type = 'password';
      if (icon) {
        icon.classList.remove('bi-eye-slash');
        icon.classList.add('bi-eye');
      }
    }
  }

  // Carregar Dados do Perfil e Preencher Formulários
  async function carregarDadosPerfil() {
    const token = localStorage.getItem('token');
    if (!token) return;

    try {
      const res = await fetch('/api/usuarios/perfil', {
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (!res.ok) throw new Error('Não foi possível carregar o perfil.');
      const user = await res.json();

      // Aba 1: Dados Pessoais
      const cfgNome = document.getElementById('cfgNome');
      const cfgEmail = document.getElementById('cfgEmail');
      const cfgTelefone = document.getElementById('cfgTelefone');

      if (cfgNome) cfgNome.value = user.nome || '';
      if (cfgEmail) cfgEmail.value = user.email || '';
      if (cfgTelefone) {
        cfgTelefone.value = user.telefone || '';
        aplicarMascaraTelefone(cfgTelefone);
        // Dispara evento para formatar caso venha apenas dígitos
        cfgTelefone.dispatchEvent(new Event('input'));
      }

      // Aba 3: Card de Perfil
      const cfgPerfilNome = document.getElementById('cfgPerfilNome');
      const cfgPerfilEmail = document.getElementById('cfgPerfilEmail');
      const cfgPerfilRoleBadge = document.getElementById('cfgPerfilRoleBadge');
      const cfgPerfilLgpdBadge = document.getElementById('cfgPerfilLgpdBadge');
      const cfgPerfilImagemBadge = document.getElementById('cfgPerfilImagemBadge');
      const cfgPerfilDataCriacao = document.getElementById('cfgPerfilDataCriacao');
      const cfgPerfilAvatar = document.getElementById('cfgPerfilAvatar');

      if (cfgPerfilNome) cfgPerfilNome.textContent = user.nome || 'Usuário';
      if (cfgPerfilEmail) cfgPerfilEmail.textContent = user.email || '-';
      
      if (cfgPerfilAvatar && user.nome) {
        const iniciais = user.nome.split(' ').map(n => n[0]).slice(0, 2).join('').toUpperCase();
        cfgPerfilAvatar.textContent = iniciais || 'CS';
      }

      if (cfgPerfilRoleBadge) {
        const role = (user.perfil || 'candidato').toLowerCase();
        const roleLabels = {
          candidato: '<i class="bi bi-stars"></i> Modelo Voluntário',
          profissional: '<i class="bi bi-mortarboard-fill"></i> Professor(a)',
          coordenador: '<i class="bi bi-diagram-3-fill"></i> Coordenação',
          admin: '<i class="bi bi-shield-fill-check"></i> Administrador'
        };
        cfgPerfilRoleBadge.innerHTML = roleLabels[role] || '<i class="bi bi-person"></i> Participante';
      }

      if (cfgPerfilLgpdBadge) {
        cfgPerfilLgpdBadge.className = user.consentimento_termos 
          ? 'badge bg-success-subtle text-success border border-success-subtle' 
          : 'badge bg-danger-subtle text-danger border border-danger-subtle';
        cfgPerfilLgpdBadge.innerHTML = user.consentimento_termos 
          ? '<i class="bi bi-shield-check"></i> Termos LGPD OK' 
          : '<i class="bi bi-shield-x"></i> Sem LGPD';
      }

      if (cfgPerfilImagemBadge) {
        cfgPerfilImagemBadge.className = user.consentimento_imagem 
          ? 'badge bg-info-subtle text-info-emphasis border border-info-subtle' 
          : 'badge bg-light text-muted border';
        cfgPerfilImagemBadge.innerHTML = user.consentimento_imagem 
          ? '<i class="bi bi-camera"></i> Imagem Autorizada' 
          : '<i class="bi bi-camera-video-off"></i> Sem Imagem';
      }

      if (cfgPerfilDataCriacao && user.created_at) {
        const d = new Date(user.created_at);
        cfgPerfilDataCriacao.textContent = d.toLocaleDateString('pt-BR');
      }

      // Carregar Agendamentos Ativos na Aba 3
      carregarAgendamentosAtivos();

    } catch (err) {
      console.warn('Erro ao carregar configurações do perfil:', err.message);
    }
  }

  // Carregar Lista de Agendamentos Ativos do Usuário
  async function carregarAgendamentosAtivos() {
    const container = document.getElementById('cfgListaAgendamentos');
    if (!container) return;

    const token = localStorage.getItem('token');
    if (!token) {
      container.innerHTML = '<div class="text-center py-3 text-muted small">Faça login para ver seus agendamentos.</div>';
      return;
    }

    try {
      container.innerHTML = `
        <div class="text-center py-3 text-muted small">
          <div class="spinner-border spinner-border-sm text-primary me-2" role="status"></div>
          Buscando seus agendamentos...
        </div>
      `;

      const res = await fetch('/api/agendamentos/meus', {
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (!res.ok) throw new Error('Falha ao buscar agendamentos.');
      const agendamentos = await res.json();

      if (!Array.isArray(agendamentos) || agendamentos.length === 0) {
        container.innerHTML = `
          <div class="p-3 text-center bg-light rounded-3 border">
            <i class="bi bi-calendar-x text-muted fs-3 d-block mb-1"></i>
            <p class="text-muted small mb-2">Você ainda não possui nenhum agendamento ativo.</p>
            <a href="painel.html#vitrine" class="btn btn-sm btn-primary" data-bs-dismiss="modal">
              <i class="bi bi-calendar-plus me-1"></i> Agendar Agora
            </a>
          </div>
        `;
        return;
      }

      // Renderizar Cards de Agendamentos
      const html = agendamentos.map(ag => {
        const cursoNome = ag.disponibilidades?.cursos?.nome || 'Atendimento Prático';
        const fotoUrl = ag.disponibilidades?.cursos?.foto_url || 'assets/logo-connect-senac.png';
        const dataHoraRaw = ag.disponibilidades?.data_hora;
        
        const deptoCurso = ag.disponibilidades?.cursos?.departamento;
        const fusoInfo = window.SenacLocalizacao ? window.SenacLocalizacao.getInfoFusoDepartamento(deptoCurso) : null;
        const siglaFuso = fusoInfo ? fusoInfo.siglaFuso : 'BRT';

        let dataFormatada = 'Data a confirmar';
        let horaFormatada = '';
        let isPassado = false;

        if (dataHoraRaw) {
          if (window.SenacLocalizacao) {
            dataFormatada = window.SenacLocalizacao.formatarDataHoraNoFuso(dataHoraRaw, deptoCurso, { day: '2-digit', month: '2-digit', year: 'numeric' });
            horaFormatada = `${window.SenacLocalizacao.formatarDataHoraNoFuso(dataHoraRaw, deptoCurso, { hour: '2-digit', minute: '2-digit' })} (${siglaFuso})`;
            const rel = window.SenacLocalizacao.calcularTempoRelativo(dataHoraRaw, deptoCurso);
            isPassado = rel ? rel.isPassado : new Date(dataHoraRaw) < new Date();
          } else {
            const d = new Date(dataHoraRaw);
            isPassado = d < new Date();
            dataFormatada = d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' });
            horaFormatada = `${d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })} (${siglaFuso})`;
          }
        }

        const statusBadges = {
          agendado: '<span class="badge bg-primary-subtle text-primary border border-primary-subtle"><i class="bi bi-clock-fill me-1"></i> Confirmado</span>',
          concluido: '<span class="badge bg-success-subtle text-success border border-success-subtle"><i class="bi bi-check-circle-fill me-1"></i> Concluído</span>',
          cancelado: '<span class="badge bg-danger-subtle text-danger border border-danger-subtle"><i class="bi bi-x-circle-fill me-1"></i> Cancelado</span>'
        };

        const statusHtml = statusBadges[ag.status] || `<span class="badge bg-secondary">${ag.status}</span>`;

        return `
          <div class="settings-appointment-item p-2 mb-2 rounded-3 border d-flex align-items-center justify-content-between gap-3 ${isPassado ? 'bg-light opacity-75' : 'bg-white shadow-xs'}">
            <div class="d-flex align-items-center gap-2 overflow-hidden">
              <img src="${fotoUrl}" alt="${cursoNome}" class="rounded-2" style="width: 44px; height: 44px; object-fit: cover;">
              <div class="overflow-hidden">
                <strong class="d-block text-truncate text-dark small font-heading">${cursoNome}</strong>
                <small class="text-muted d-block" style="font-size: 0.72rem;">
                  <i class="bi bi-calendar3 me-1"></i>${dataFormatada} às ${horaFormatada}
                </small>
              </div>
            </div>
            <div class="text-end flex-shrink-0">
              ${statusHtml}
            </div>
          </div>
        `;
      }).join('');

      container.innerHTML = html;

    } catch (err) {
      container.innerHTML = `
        <div class="alert alert-warning py-2 small mb-0">
          <i class="bi bi-exclamation-triangle me-1"></i> Não foi possível carregar os agendamentos no momento.
        </div>
      `;
    }
  }

  // Salvar Dados Pessoais
  async function salvarDadosPessoais(e) {
    e.preventDefault();
    const btn = document.getElementById('btnSalvarDadosPessoais');
    const nome = document.getElementById('cfgNome')?.value?.trim();
    const telefone = document.getElementById('cfgTelefone')?.value?.trim();
    const token = localStorage.getItem('token');

    if (!nome) {
      mostrarAlerta('Por favor, informe o seu nome completo.', 'danger');
      return;
    }

    try {
      if (btn) {
        btn.disabled = true;
        btn.querySelector('.btn-text')?.classList.add('d-none');
        btn.querySelector('.spinner-border')?.classList.remove('d-none');
      }

      const res = await fetch('/api/usuarios/perfil', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ nome, telefone })
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.erro || 'Falha ao salvar dados.');

      mostrarAlerta('<i class="bi bi-check-circle-fill me-1"></i> Dados pessoais atualizados com sucesso!', 'success');
      
      // Atualiza nome na interface se existir
      const navUserName = document.getElementById('navUserName') || document.getElementById('drawerUserName');
      if (navUserName) navUserName.textContent = nome;

      // Recarrega informações do perfil
      carregarDadosPerfil();

    } catch (err) {
      mostrarAlerta(`<i class="bi bi-x-circle-fill me-1"></i> ${err.message}`, 'danger');
    } finally {
      if (btn) {
        btn.disabled = false;
        btn.querySelector('.btn-text')?.classList.remove('d-none');
        btn.querySelector('.spinner-border')?.classList.add('d-none');
      }
    }
  }

  // Salvar Nova Senha
  async function salvarNovaSenha(e) {
    e.preventDefault();
    const btn = document.getElementById('btnSalvarSenha');
    const senhaAtual = document.getElementById('cfgSenhaAtual')?.value;
    const novaSenha = document.getElementById('cfgNovaSenha')?.value;
    const confirmarNovaSenha = document.getElementById('cfgConfirmarSenha')?.value;
    const token = localStorage.getItem('token');

    if (!senhaAtual || !novaSenha || !confirmarNovaSenha) {
      mostrarAlerta('Por favor, preencha todos os campos de senha.', 'danger');
      return;
    }

    if (novaSenha.length < 6) {
      mostrarAlerta('A nova senha deve possuir pelo menos 6 caracteres.', 'danger');
      return;
    }

    if (novaSenha !== confirmarNovaSenha) {
      mostrarAlerta('A confirmação não coincide com a nova senha digitada.', 'danger');
      return;
    }

    try {
      if (btn) {
        btn.disabled = true;
        btn.querySelector('.btn-text')?.classList.add('d-none');
        btn.querySelector('.spinner-border')?.classList.remove('d-none');
      }

      const res = await fetch('/api/usuarios/alterar-senha', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ senhaAtual, novaSenha, confirmarNovaSenha })
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.erro || 'Falha ao alterar senha.');

      mostrarAlerta('<i class="bi bi-shield-check me-1"></i> Senha alterada com sucesso!', 'success');
      
      // Limpa os campos
      document.getElementById('formAlterarSenha')?.reset();
      const strengthBar = document.getElementById('cfgPassStrengthBar');
      if (strengthBar) strengthBar.style.width = '0%';

    } catch (err) {
      mostrarAlerta(`<i class="bi bi-x-circle-fill me-1"></i> ${err.message}`, 'danger');
    } finally {
      if (btn) {
        btn.disabled = false;
        btn.querySelector('.btn-text')?.classList.remove('d-none');
        btn.querySelector('.spinner-border')?.classList.add('d-none');
      }
    }
  }

  // Configurar Eventos do Modal
  function configurarEventosModal() {
    const formPessoal = document.getElementById('formDadosPessoais');
    if (formPessoal) formPessoal.addEventListener('submit', salvarDadosPessoais);

    const formSenha = document.getElementById('formAlterarSenha');
    if (formSenha) formSenha.addEventListener('submit', salvarNovaSenha);

    // Toggle de visibilidade da senha
    document.querySelectorAll('.btn-toggle-pass').forEach(btn => {
      btn.addEventListener('click', () => alternarOlhoSenha(btn));
    });

    // Barra de força de senha ao digitar
    const novaSenhaInput = document.getElementById('cfgNovaSenha');
    const strengthBar = document.getElementById('cfgPassStrengthBar');
    if (novaSenhaInput && strengthBar) {
      novaSenhaInput.addEventListener('input', (e) => {
        const score = calcularForcaSenha(e.target.value);
        strengthBar.style.width = `${score}%`;
        if (score < 40) {
          strengthBar.style.backgroundColor = '#ef4444';
        } else if (score < 75) {
          strengthBar.style.backgroundColor = '#f59e0b';
        } else {
          strengthBar.style.backgroundColor = '#10b981';
        }
      });
    }

    // Botão de recarregar agendamentos
    const btnReload = document.getElementById('btnRecarregarAgendamentos');
    if (btnReload) {
      btnReload.addEventListener('click', carregarAgendamentosAtivos);
    }
  }

  // Abrir Modal de Configurações
  function abrirModalConfiguracoes() {
    const token = localStorage.getItem('token');
    if (!token) {
      if (typeof window.mostrarToast === 'function') {
        window.mostrarToast('Por favor, faça login para acessar suas configurações.', 'warning');
      }
      setTimeout(() => {
        window.location.href = 'login.html';
      }, 1200);
      return;
    }

    injetarModalConfiguracoes();
    carregarDadosPerfil();

    const modalEl = document.getElementById('modalConfiguracoesConta');
    if (modalEl && typeof bootstrap !== 'undefined') {
      const bsModal = bootstrap.Modal.getOrCreateInstance(modalEl);
      bsModal.show();
    }
  }

  // Auto-inicialização e Vinculação de Gatilhos na DOM
  function inicializarGatilhosConfiguracoes() {
    injetarModalConfiguracoes();

    document.addEventListener('click', (e) => {
      const trigger = e.target.closest('.btn-settings-trigger, #btnConfiguracoes, #btnDrawerConfiguracoes, [data-action="open-settings"]');
      if (trigger) {
        e.preventDefault();
        abrirModalConfiguracoes();
      }
    });
  }

  // Exportação Global
  window.abrirModalConfiguracoes = abrirModalConfiguracoes;

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', inicializarGatilhosConfiguracoes);
  } else {
    inicializarGatilhosConfiguracoes();
  }

})();
