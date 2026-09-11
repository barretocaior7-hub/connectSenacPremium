// public/js/senac-localizacao.js
// Gestão de Geolocalização e Departamento Regional do Usuário no Connect Senac

(function (window) {
  'use strict';

  const STORAGE_KEY_DEPTO = 'senac_user_departamento';
  const STORAGE_KEY_CIDADE = 'senac_user_cidade';
  const STORAGE_KEY_STATUS = 'senac_user_loc_status';

  // Relação de Departamentos Regionais e UFs com Fuso Horário Oficial IANA
  const DEPARTAMENTOS_MAP = {
    'BA': { sigla: 'DR/BA', nome: 'Bahia (DR/BA)', capital: 'Salvador', lat: -12.9714, lon: -38.5014, timeZone: 'America/Bahia', offset: -3, fusoDesc: 'Horário Oficial de Brasília (UTC-3)', siglaFuso: 'BRT' },
    'SP': { sigla: 'DR/SP', nome: 'São Paulo (DR/SP)', capital: 'São Paulo', lat: -23.5505, lon: -46.6333, timeZone: 'America/Sao_Paulo', offset: -3, fusoDesc: 'Horário Oficial de Brasília (UTC-3)', siglaFuso: 'BRT' },
    'RJ': { sigla: 'DR/RJ', nome: 'Rio de Janeiro (DR/RJ)', capital: 'Rio de Janeiro', lat: -22.9068, lon: -43.1729, timeZone: 'America/Sao_Paulo', offset: -3, fusoDesc: 'Horário Oficial de Brasília (UTC-3)', siglaFuso: 'BRT' },
    'MG': { sigla: 'DR/MG', nome: 'Minas Gerais (DR/MG)', capital: 'Belo Horizonte', lat: -19.9167, lon: -43.9345, timeZone: 'America/Sao_Paulo', offset: -3, fusoDesc: 'Horário Oficial de Brasília (UTC-3)', siglaFuso: 'BRT' },
    'AC': { sigla: 'DR/AC', nome: 'Acre (DR/AC)', capital: 'Rio Branco', lat: -9.97499, lon: -67.8243, timeZone: 'America/Rio_Branco', offset: -5, fusoDesc: 'Horário do Acre (UTC-5)', siglaFuso: 'ACT' },
    'AL': { sigla: 'DR/AL', nome: 'Alagoas (DR/AL)', capital: 'Maceió', lat: -9.66583, lon: -35.7353, timeZone: 'America/Maceio', offset: -3, fusoDesc: 'Horário de Alagoas (UTC-3)', siglaFuso: 'BRT' },
    'AP': { sigla: 'DR/AP', nome: 'Amapá (DR/AP)', capital: 'Macapá', lat: 0.03889, lon: -51.0664, timeZone: 'America/Belem', offset: -3, fusoDesc: 'Horário do Amapá (UTC-3)', siglaFuso: 'BRT' },
    'AM': { sigla: 'DR/AM', nome: 'Amazonas (DR/AM)', capital: 'Manaus', lat: -3.11903, lon: -60.0217, timeZone: 'America/Manaus', offset: -4, fusoDesc: 'Horário do Amazonas (UTC-4)', siglaFuso: 'AMT' },
    'CE': { sigla: 'DR/CE', nome: 'Ceará (DR/CE)', capital: 'Fortaleza', lat: -3.71722, lon: -38.5431, timeZone: 'America/Fortaleza', offset: -3, fusoDesc: 'Horário do Ceará (UTC-3)', siglaFuso: 'BRT' },
    'DF': { sigla: 'DR/DF', nome: 'Distrito Federal (DR/DF)', capital: 'Brasília', lat: -15.7801, lon: -47.9292, timeZone: 'America/Sao_Paulo', offset: -3, fusoDesc: 'Horário Oficial de Brasília (UTC-3)', siglaFuso: 'BRT' },
    'ES': { sigla: 'DR/ES', nome: 'Espírito Santo (DR/ES)', capital: 'Vitória', lat: -20.3155, lon: -40.3128, timeZone: 'America/Sao_Paulo', offset: -3, fusoDesc: 'Horário do Espírito Santo (UTC-3)', siglaFuso: 'BRT' },
    'GO': { sigla: 'DR/GO', nome: 'Goiás (DR/GO)', capital: 'Goiânia', lat: -16.6869, lon: -49.2648, timeZone: 'America/Sao_Paulo', offset: -3, fusoDesc: 'Horário de Goiás (UTC-3)', siglaFuso: 'BRT' },
    'MA': { sigla: 'DR/MA', nome: 'Maranhão (DR/MA)', capital: 'São Luís', lat: -2.53073, lon: -44.3068, timeZone: 'America/Fortaleza', offset: -3, fusoDesc: 'Horário do Maranhão (UTC-3)', siglaFuso: 'BRT' },
    'MT': { sigla: 'DR/MT', nome: 'Mato Grosso (DR/MT)', capital: 'Cuiabá', lat: -15.6014, lon: -56.0979, timeZone: 'America/Cuiaba', offset: -4, fusoDesc: 'Horário do Mato Grosso (UTC-4)', siglaFuso: 'AMT' },
    'MS': { sigla: 'DR/MS', nome: 'Mato Grosso do Sul (DR/MS)', capital: 'Campo Grande', lat: -20.4697, lon: -54.6201, timeZone: 'America/Campo_Grande', offset: -4, fusoDesc: 'Horário do Mato Grosso do Sul (UTC-4)', siglaFuso: 'AMT' },
    'PA': { sigla: 'DR/PA', nome: 'Pará (DR/PA)', capital: 'Belém', lat: -1.45583, lon: -48.5039, timeZone: 'America/Belem', offset: -3, fusoDesc: 'Horário do Pará (UTC-3)', siglaFuso: 'BRT' },
    'PB': { sigla: 'DR/PB', nome: 'Paraíba (DR/PB)', capital: 'João Pessoa', lat: -7.11532, lon: -34.861, timeZone: 'America/Fortaleza', offset: -3, fusoDesc: 'Horário da Paraíba (UTC-3)', siglaFuso: 'BRT' },
    'PR': { sigla: 'DR/PR', nome: 'Paraná (DR/PR)', capital: 'Curitiba', lat: -25.4297, lon: -49.2719, timeZone: 'America/Sao_Paulo', offset: -3, fusoDesc: 'Horário do Paraná (UTC-3)', siglaFuso: 'BRT' },
    'PE': { sigla: 'DR/PE', nome: 'Pernambuco (DR/PE)', capital: 'Recife', lat: -8.05784, lon: -34.8829, timeZone: 'America/Recife', offset: -3, fusoDesc: 'Horário de Pernambuco (UTC-3)', siglaFuso: 'BRT' },
    'PI': { sigla: 'DR/PI', nome: 'Piauí (DR/PI)', capital: 'Teresina', lat: -5.09194, lon: -42.8034, timeZone: 'America/Fortaleza', offset: -3, fusoDesc: 'Horário do Piauí (UTC-3)', siglaFuso: 'BRT' },
    'RN': { sigla: 'DR/RN', nome: 'Rio Grande do Norte (DR/RN)', capital: 'Natal', lat: -5.79448, lon: -35.211, timeZone: 'America/Fortaleza', offset: -3, fusoDesc: 'Horário do Rio Grande do Norte (UTC-3)', siglaFuso: 'BRT' },
    'RS': { sigla: 'DR/RS', nome: 'Rio Grande do Sul (DR/RS)', capital: 'Porto Alegre', lat: -30.0346, lon: -51.2177, timeZone: 'America/Sao_Paulo', offset: -3, fusoDesc: 'Horário do Rio Grande do Sul (UTC-3)', siglaFuso: 'BRT' },
    'RO': { sigla: 'DR/RO', nome: 'Rondônia (DR/RO)', capital: 'Porto Velho', lat: -8.76116, lon: -63.9004, timeZone: 'America/Porto_Velho', offset: -4, fusoDesc: 'Horário de Rondônia (UTC-4)', siglaFuso: 'AMT' },
    'RR': { sigla: 'DR/RR', nome: 'Roraima (DR/RR)', capital: 'Boa Vista', lat: 2.82384, lon: -60.6753, timeZone: 'America/Boa_Vista', offset: -4, fusoDesc: 'Horário de Roraima (UTC-4)', siglaFuso: 'AMT' },
    'SC': { sigla: 'DR/SC', nome: 'Santa Catarina (DR/SC)', capital: 'Florianópolis', lat: -27.5954, lon: -48.548, timeZone: 'America/Sao_Paulo', offset: -3, fusoDesc: 'Horário de Santa Catarina (UTC-3)', siglaFuso: 'BRT' },
    'SE': { sigla: 'DR/SE', nome: 'Sergipe (DR/SE)', capital: 'Aracaju', lat: -10.9472, lon: -37.0731, timeZone: 'America/Maceio', offset: -3, fusoDesc: 'Horário de Sergipe (UTC-3)', siglaFuso: 'BRT' },
    'TO': { sigla: 'DR/TO', nome: 'Tocantins (DR/TO)', capital: 'Palmas', lat: -10.1844, lon: -48.3336, timeZone: 'America/Sao_Paulo', offset: -3, fusoDesc: 'Horário do Tocantins (UTC-3)', siglaFuso: 'BRT' }
  };

  function getDepartamentoUsuario() {
    return localStorage.getItem(STORAGE_KEY_DEPTO) || null;
  }

  function getCidadeUsuario() {
    return localStorage.getItem(STORAGE_KEY_CIDADE) || '';
  }

  function setDepartamentoUsuario(depto, status = 'manual', cidade = '') {
    if (!depto) return;
    localStorage.setItem(STORAGE_KEY_DEPTO, depto);
    localStorage.setItem(STORAGE_KEY_STATUS, status);
    if (cidade) localStorage.setItem(STORAGE_KEY_CIDADE, cidade);

    window.dispatchEvent(new CustomEvent('senacRegiaoUsuarioChanged', {
      detail: { departamento: depto, cidade, status }
    }));
  }

  function getNomeDepartamento(sigla) {
    for (const uf in DEPARTAMENTOS_MAP) {
      if (DEPARTAMENTOS_MAP[uf].sigla === sigla) {
        return DEPARTAMENTOS_MAP[uf].nome;
      }
    }
    return sigla || 'Bahia (DR/BA)';
  }

  function getInfoFusoDepartamento(sigla) {
    if (!sigla) return DEPARTAMENTOS_MAP['BA'];
    for (const uf in DEPARTAMENTOS_MAP) {
      if (DEPARTAMENTOS_MAP[uf].sigla === sigla || uf === sigla.replace('DR/', '')) {
        return DEPARTAMENTOS_MAP[uf];
      }
    }
    return DEPARTAMENTOS_MAP['BA'];
  }

  function getTimezoneAtual() {
    const depto = getDepartamentoUsuario() || 'DR/BA';
    return getInfoFusoDepartamento(depto).timeZone;
  }

  function getFusoDescAtual() {
    const depto = getDepartamentoUsuario() || 'DR/BA';
    return getInfoFusoDepartamento(depto).fusoDesc;
  }

  function getHorarioAtualFormatado(depto) {
    const info = getInfoFusoDepartamento(depto || getDepartamentoUsuario() || 'DR/BA');
    const agora = new Date();

    const horaFormatada = new Intl.DateTimeFormat('pt-BR', {
      timeZone: info.timeZone,
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false
    }).format(agora);

    const dataFormatada = new Intl.DateTimeFormat('pt-BR', {
      timeZone: info.timeZone,
      weekday: 'long',
      day: '2-digit',
      month: 'long',
      year: 'numeric'
    }).format(agora);

    return {
      hora: horaFormatada,
      data: dataFormatada,
      fuso: info.fusoDesc,
      sigla: info.siglaFuso,
      timeZone: info.timeZone,
      offset: info.offset
    };
  }

  function formatarDataHoraNoFuso(dataHora, depto, options = {}) {
    if (!dataHora) return 'Data a definir';
    const d = new Date(dataHora);
    if (isNaN(d.getTime())) return 'Data inválida';

    const info = getInfoFusoDepartamento(depto || getDepartamentoUsuario() || 'DR/BA');
    
    const finalOptions = Object.keys(options).length > 0
      ? { timeZone: info.timeZone, ...options }
      : {
          timeZone: info.timeZone,
          day: '2-digit',
          month: '2-digit',
          year: 'numeric',
          hour: '2-digit',
          minute: '2-digit',
          hour12: false
        };

    return new Intl.DateTimeFormat('pt-BR', finalOptions).format(d);
  }

  function calcularTempoRelativo(dataHora, depto) {
    if (!dataHora) return { texto: 'Data a definir', badge: '', isPassado: true, isHoje: false };
    const d = new Date(dataHora);
    if (isNaN(d.getTime())) return { texto: 'Data inválida', badge: '', isPassado: true, isHoje: false };

    const info = getInfoFusoDepartamento(depto || getDepartamentoUsuario() || 'DR/BA');
    const agora = new Date();

    const diffMs = d.getTime() - agora.getTime();
    const diffHoras = diffMs / (1000 * 60 * 60);
    const diffDias = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    // Determinar se é hoje no fuso
    const dataFmt = new Intl.DateTimeFormat('en-CA', { timeZone: info.timeZone, year: 'numeric', month: '2-digit', day: '2-digit' });
    const hojeStr = dataFmt.format(agora);
    const dataAlvoStr = dataFmt.format(d);

    const isHoje = hojeStr === dataAlvoStr;
    const isPassado = diffMs <= 0;

    const horaMinuto = new Intl.DateTimeFormat('pt-BR', { timeZone: info.timeZone, hour: '2-digit', minute: '2-digit', hour12: false }).format(d);
    const diaSemana = new Intl.DateTimeFormat('pt-BR', { timeZone: info.timeZone, weekday: 'short' }).format(d).replace('.', '').toUpperCase();
    const diaMes = new Intl.DateTimeFormat('pt-BR', { timeZone: info.timeZone, day: '2-digit', month: '2-digit' }).format(d);

    let textoRelativo = '';
    let badgeRelativo = '';

    if (isPassado) {
      textoRelativo = 'Encerrado';
      badgeRelativo = '<span class="badge bg-secondary">Encerrado</span>';
    } else if (isHoje) {
      if (diffHoras < 1) {
        const minRestantes = Math.max(1, Math.round(diffMs / (1000 * 60)));
        textoRelativo = `Hoje às ${horaMinuto}`;
        badgeRelativo = `<span class="badge bg-danger text-white"><i class="bi bi-clock-history me-1"></i> Começa em ${minRestantes} min</span>`;
      } else {
        const hRestantes = Math.round(diffHoras);
        textoRelativo = `Hoje às ${horaMinuto}`;
        badgeRelativo = `<span class="badge bg-warning text-dark border border-warning"><i class="bi bi-fire text-danger me-1"></i> Hoje (em ${hRestantes}h)</span>`;
      }
    } else if (diffDias === 1 || (diffHoras > 0 && diffHoras <= 36)) {
      textoRelativo = `Amanhã às ${horaMinuto}`;
      badgeRelativo = `<span class="badge bg-primary bg-opacity-10 text-primary border border-primary border-opacity-25">Amanhã às ${horaMinuto}</span>`;
    } else {
      textoRelativo = `${diaSemana}, ${diaMes} às ${horaMinuto}`;
      badgeRelativo = `<span class="badge bg-light text-dark border">${diaSemana} • ${diaMes}</span>`;
    }

    return {
      texto: textoRelativo,
      badge: badgeRelativo,
      horaMinuto,
      diaSemana,
      diaMes,
      isHoje,
      isPassado,
      diffHoras,
      siglaFuso: info.siglaFuso,
      fusoDesc: info.fusoDesc
    };
  }

  let clockIntervalId = null;

  function iniciarRelogioRegional() {
    if (clockIntervalId) {
      clearInterval(clockIntervalId);
      clockIntervalId = null;
    }

    function atualizarTick() {
      const depto = getDepartamentoUsuario() || 'DR/BA';
      const dados = getHorarioAtualFormatado(depto);

      document.querySelectorAll('.senac-live-time').forEach(el => {
        el.textContent = dados.hora;
      });

      document.querySelectorAll('.senac-live-date').forEach(el => {
        el.textContent = dados.data;
      });

      document.querySelectorAll('.senac-live-timezone-badge').forEach(el => {
        el.textContent = dados.sigla;
        el.title = dados.fuso;
      });

      document.querySelectorAll('.senac-live-fuso-desc').forEach(el => {
        el.textContent = dados.fuso;
      });
    }

    atualizarTick();
    clockIntervalId = setInterval(atualizarTick, 1000);
  }

  // Fallback por distância euclidiana para capitais brasileiras
  function aproximarUfPorCoordenadas(lat, lon) {
    let menorDistancia = Infinity;
    let ufMaisProxima = 'BA';

    for (const uf in DEPARTAMENTOS_MAP) {
      const item = DEPARTAMENTOS_MAP[uf];
      const dLat = lat - item.lat;
      const dLon = lon - item.lon;
      const dist = (dLat * dLat) + (dLon * dLon);
      if (dist < menorDistancia) {
        menorDistancia = dist;
        ufMaisProxima = uf;
      }
    }
    return ufMaisProxima;
  }

  // Reverse Geocoding usando Google Maps Geocoder ou serviço gratuito leve com fallback
  async function identificarUfPorCoordenadas(lat, lon) {
    // 1. Tentar via Google Maps Geocoder se o SDK estiver ativo
    if (typeof google !== 'undefined' && google.maps && google.maps.Geocoder) {
      try {
        const geocoder = new google.maps.Geocoder();
        const response = await geocoder.geocode({ location: { lat, lng: lon } });
        if (response.results && response.results.length > 0) {
          let uf = '';
          let cidade = '';
          for (const component of response.results[0].address_components) {
            if (component.types.includes('administrative_area_level_1')) {
              uf = component.short_name.toUpperCase();
            }
            if (component.types.includes('administrative_area_level_2') || component.types.includes('locality')) {
              cidade = component.long_name;
            }
          }
          if (uf && DEPARTAMENTOS_MAP[uf]) {
            return {
              uf,
              cidade,
              depto: DEPARTAMENTOS_MAP[uf].sigla
            };
          }
        }
      } catch (gErr) {
        console.warn('Google Maps Geocoding fallback acionado:', gErr);
      }
    }

    // 2. Tentar via BigDataCloud Reverse Geocoding
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 6000);
      const url = `https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${lat}&longitude=${lon}&localityLanguage=pt`;
      const res = await fetch(url, { signal: controller.signal });
      clearTimeout(timeoutId);

      if (res.ok) {
        const data = await res.json();
        let uf = '';
        if (data.principalSubdivisionCode && data.principalSubdivisionCode.startsWith('BR-')) {
          uf = data.principalSubdivisionCode.replace('BR-', '').toUpperCase();
        } else if (data.principalSubdivision) {
          const nomeNorm = data.principalSubdivision.toLowerCase();
          for (const k in DEPARTAMENTOS_MAP) {
            if (DEPARTAMENTOS_MAP[k].nome.toLowerCase().includes(nomeNorm)) {
              uf = k;
              break;
            }
          }
        }
        if (uf && DEPARTAMENTOS_MAP[uf]) {
          return {
            uf,
            cidade: data.city || data.locality || '',
            depto: DEPARTAMENTOS_MAP[uf].sigla
          };
        }
      }
    } catch (_) {
      // Fallback em caso de offline/bloqueador
    }

    // 3. Fallback matemático por proximidade de coordenadas
    const ufFallback = aproximarUfPorCoordenadas(lat, lon);
    return {
      uf: ufFallback,
      cidade: '',
      depto: DEPARTAMENTOS_MAP[ufFallback].sigla
    };
  }

  // Solicitar GPS do navegador
  function solicitarGeolocalizacao(btnElement, callbackSucesso, callbackErro) {
    if (!('geolocation' in navigator)) {
      alert('Seu navegador não suporta geolocalização. Por favor, selecione seu estado manualmente.');
      abrirModalSelecao();
      if (callbackErro) callbackErro();
      return;
    }

    if (btnElement) {
      btnElement.disabled = true;
      btnElement.innerHTML = '<span class="spinner-border spinner-border-sm me-1" role="status"></span> Localizando você...';
    }

    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        try {
          const lat = pos.coords.latitude;
          const lon = pos.coords.longitude;
          const res = await identificarUfPorCoordenadas(lat, lon);
          setDepartamentoUsuario(res.depto, 'granted', res.cidade);
          if (callbackSucesso) callbackSucesso(res);
        } catch (e) {
          const fallback = 'DR/BA';
          setDepartamentoUsuario(fallback, 'manual', '');
          if (callbackSucesso) callbackSucesso({ depto: fallback });
        } finally {
          if (btnElement) {
            btnElement.disabled = false;
            btnElement.innerHTML = '<i class="bi bi-crosshair me-1"></i> Permitir Minha Localização';
          }
        }
      },
      (err) => {
        if (btnElement) {
          btnElement.disabled = false;
          btnElement.innerHTML = '<i class="bi bi-crosshair me-1"></i> Permitir Minha Localização';
        }
        localStorage.setItem(STORAGE_KEY_STATUS, 'denied');
        alert('Não foi possível obter sua localização automaticamente. Escolha o seu estado para ver os cursos da sua região.');
        abrirModalSelecao();
        if (callbackErro) callbackErro(err);
      },
      { timeout: 12000, enableHighAccuracy: false }
    );
  }

  // Modal de Seleção Manual
  let modalSelecaoInstance = null;

  function garantirModalSelecao() {
    if (document.getElementById('modalSelecaoRegiaoSenac')) return;

    let opcoesHtml = '';
    for (const uf in DEPARTAMENTOS_MAP) {
      const item = DEPARTAMENTOS_MAP[uf];
      opcoesHtml += `
        <div class="col-sm-6 col-md-4">
          <button type="button" class="btn btn-outline-secondary w-100 text-start p-2 d-flex align-items-center justify-content-between rounded-3 btn-depto-opcao" data-depto="${item.sigla}">
            <span class="small fw-bold text-dark">${item.nome}</span>
            <span class="badge bg-light text-muted border">${uf}</span>
          </button>
        </div>
      `;
    }

    const modalDiv = document.createElement('div');
    modalDiv.className = 'modal fade';
    modalDiv.id = 'modalSelecaoRegiaoSenac';
    modalDiv.tabIndex = -1;
    modalDiv.setAttribute('aria-labelledby', 'modalSelecaoRegiaoSenacTitulo');
    modalDiv.setAttribute('aria-hidden', 'true');
    modalDiv.innerHTML = `
      <div class="modal-dialog modal-dialog-centered modal-lg modal-dialog-scrollable">
        <div class="modal-content modal-content-custom">
          <div class="modal-header modal-header-custom border-bottom">
            <div class="d-flex align-items-center gap-2">
              <div class="card-header-icon"><i class="bi bi-geo-alt-fill text-primary"></i></div>
              <div>
                <h5 class="modal-title font-heading fw-bold mb-0" id="modalSelecaoRegiaoSenacTitulo">Escolha seu Estado / Departamento</h5>
                <small class="text-muted">Veja apenas os atendimentos e cursos do Senac na sua região</small>
              </div>
            </div>
            <button type="button" class="btn-close btn-close-white" data-bs-dismiss="modal" aria-label="Fechar"></button>
          </div>
          <div class="modal-body p-4">
            <div class="input-group search-bar-premium mb-3">
              <span class="input-group-text border-0 shadow-none"><i class="bi bi-search"></i></span>
              <input type="text" class="form-control border-0 shadow-none" id="buscaModalRegiao" placeholder="Filtrar por estado ou sigla (ex: Bahia, SP, RJ)..." />
            </div>
            <div class="row g-2" id="gradeOpcoesRegioes">
              ${opcoesHtml}
            </div>
          </div>
          <div class="modal-footer modal-footer-custom d-flex justify-content-between">
            <button type="button" class="btn btn-sm btn-outline-primary" onclick="SenacLocalizacao.detectarGPS(this)">
              <i class="bi bi-crosshair me-1"></i> Detectar automaticamente via GPS
            </button>
            <button type="button" class="btn btn-sm btn-light-custom px-3" data-bs-dismiss="modal">Fechar</button>
          </div>
        </div>
      </div>
    `;
    document.body.appendChild(modalDiv);

    // Eventos de clique nas opções
    modalDiv.querySelectorAll('.btn-depto-opcao').forEach(btn => {
      btn.addEventListener('click', () => {
        const depto = btn.dataset.depto;
        setDepartamentoUsuario(depto, 'manual', '');
        if (modalSelecaoInstance) modalSelecaoInstance.hide();
      });
    });

    // Filtro de busca de regiões
    const inputBusca = modalDiv.querySelector('#buscaModalRegiao');
    if (inputBusca) {
      inputBusca.addEventListener('input', () => {
        const termo = inputBusca.value.toLowerCase().trim();
        modalDiv.querySelectorAll('.btn-depto-opcao').forEach(btn => {
          const texto = btn.textContent.toLowerCase();
          btn.parentElement.style.display = texto.includes(termo) ? '' : 'none';
        });
      });
    }
  }

  function abrirModalSelecao() {
    garantirModalSelecao();
    const modalEl = document.getElementById('modalSelecaoRegiaoSenac');
    if (modalEl && window.bootstrap && window.bootstrap.Modal) {
      modalSelecaoInstance = bootstrap.Modal.getInstance(modalEl) || new bootstrap.Modal(modalEl);
      modalSelecaoInstance.show();
    }
  }

  // Modal Pop-up de Solicitação de Permissão de Localização
  let modalPermissaoInstance = null;

  function garantirModalPermissao() {
    if (document.getElementById('modalPermissaoLocalizacao')) return;

    const modalDiv = document.createElement('div');
    modalDiv.className = 'modal fade';
    modalDiv.id = 'modalPermissaoLocalizacao';
    modalDiv.tabIndex = -1;
    modalDiv.setAttribute('aria-labelledby', 'modalPermissaoLocalizacaoTitulo');
    modalDiv.setAttribute('aria-hidden', 'true');
    modalDiv.setAttribute('data-bs-backdrop', 'static');
    modalDiv.innerHTML = `
      <div class="modal-dialog modal-dialog-centered">
        <div class="modal-content modal-content-custom border-0 shadow-lg" style="border-radius: 22px; overflow: hidden;">
          <div class="modal-body p-4 text-center">
            <div class="d-inline-flex align-items-center justify-content-center p-3 rounded-circle bg-primary bg-opacity-10 text-primary mb-3 shadow-sm" style="width: 72px; height: 72px;">
              <i class="bi bi-geo-alt-fill fs-1 text-danger"></i>
            </div>
            
            <h4 class="fw-bold font-heading mb-2 text-dark" id="modalPermissaoLocalizacaoTitulo">
              Ver cursos na sua região?
            </h4>
            
            <p class="text-secondary small mb-3 px-2" style="line-height: 1.6;">
              Deseja permitir o acesso à sua <strong>localização atual</strong>? Com isso, filtraremos automaticamente os cursos práticos e atendimentos gratuitos disponíveis no departamento regional do SENAC mais próximo de você.
            </p>

            <div id="statusDetectandoLoc" class="alert alert-info py-2 px-3 small rounded-3 d-none mb-3">
              <span class="spinner-border spinner-border-sm me-2" role="status"></span>
              Identificando sua localização e buscando cursos da sua região...
            </div>

            <div class="d-grid gap-2 pt-2">
              <button type="button" class="btn btn-brand py-3 fw-bold shadow-sm" id="btnPermitirLocalizacaoPopup">
                <i class="bi bi-crosshair me-2"></i> Permitir Localização
              </button>
              <button type="button" class="btn btn-light py-2 border small text-muted" id="btnNegarLocalizacaoPopup">
                Agora não / Escolher Estado
              </button>
            </div>
          </div>
        </div>
      </div>
    `;
    document.body.appendChild(modalDiv);

    const btnPermitir = modalDiv.querySelector('#btnPermitirLocalizacaoPopup');
    const btnNegar = modalDiv.querySelector('#btnNegarLocalizacaoPopup');
    const statusDiv = modalDiv.querySelector('#statusDetectandoLoc');

    btnPermitir.addEventListener('click', () => {
      btnPermitir.disabled = true;
      btnNegar.disabled = true;
      if (statusDiv) statusDiv.classList.remove('d-none');

      solicitarGeolocalizacao(btnPermitir, (res) => {
        if (modalPermissaoInstance) modalPermissaoInstance.hide();
      }, (err) => {
        if (modalPermissaoInstance) modalPermissaoInstance.hide();
      });
    });

    btnNegar.addEventListener('click', () => {
      localStorage.setItem(STORAGE_KEY_STATUS, 'denied');
      if (modalPermissaoInstance) modalPermissaoInstance.hide();
      abrirModalSelecao();
    });
  }

  function checarExibirPopupPermissao() {
    const status = localStorage.getItem(STORAGE_KEY_STATUS);
    // Se o usuário ainda não definiu a permissão de localização
    if (!status) {
      setTimeout(() => {
        garantirModalPermissao();
        const modalEl = document.getElementById('modalPermissaoLocalizacao');
        if (modalEl && window.bootstrap && window.bootstrap.Modal) {
          modalPermissaoInstance = bootstrap.Modal.getOrCreateInstance(modalEl);
          modalPermissaoInstance.show();
        }
      }, 600);
    }
  }

  // Renderizar o Banner ou a Barra de Região no container especificado
  function renderizarBarraOuBanner(containerId, onLocationChanged) {
    const container = document.getElementById(containerId);
    if (!container) return;

    const deptoAtual = getDepartamentoUsuario();
    const cidadeAtual = getCidadeUsuario();

    if (!deptoAtual) {
      // Banner convidando a permitir a localização
      container.innerHTML = `
        <div class="senac-loc-banner p-4 mb-4 rounded-3 text-white shadow-sm" style="background: linear-gradient(135deg, #004a8d 0%, #002b54 100%); border-left: 5px solid #f29100;">
          <div class="row align-items-center g-3">
            <div class="col-lg-8">
              <span class="badge bg-warning text-dark fw-bold px-2 py-1 mb-2">
                <i class="bi bi-geo-alt-fill"></i> Atendimentos Perto de Você
              </span>
              <h5 class="fw-bold font-heading mb-1 text-white">Descubra os cursos do SENAC disponíveis na sua região</h5>
              <p class="mb-0 small text-white-50">
                Permita o acesso à sua localização para vermos procedimentos práticos gratuitos na sua unidade regional do SENAC.
              </p>
            </div>
            <div class="col-lg-4 d-flex flex-wrap gap-2 justify-content-lg-end">
              <button class="btn btn-orange fw-bold text-white shadow-sm px-3" id="btnPermitirLoc" onclick="SenacLocalizacao.detectarGPS(this)">
                <i class="bi bi-crosshair me-1"></i> Permitir Minha Localização
              </button>
              <button class="btn btn-outline-light btn-sm px-3" onclick="SenacLocalizacao.abrirModalSelecao()">
                <i class="bi bi-globe me-1"></i> Escolher Estado
              </button>
            </div>
          </div>
        </div>
      `;
    } else {
      // Barra informativa com departamento ativo, relógio regional em tempo real e botão de alterar
      const nomeCompleto = getNomeDepartamento(deptoAtual);
      const dadosFuso = getHorarioAtualFormatado(deptoAtual);

      container.innerHTML = `
        <div class="senac-regiao-bar d-flex flex-wrap align-items-center justify-content-between p-3 mb-4 rounded-3 shadow-sm bg-white border" style="border-left: 4px solid var(--senac-blue) !important; gap: 14px;">
          
          <!-- Bloco 1: Região Ativa -->
          <div class="d-flex align-items-center gap-2">
            <span class="badge bg-primary-subtle text-primary border border-primary-subtle p-2 fs-6">
              <i class="bi bi-geo-alt-fill"></i>
            </span>
            <div>
              <span class="small text-muted d-block" style="font-size: 0.78rem;">Exibindo procedimentos para:</span>
              <strong class="text-dark font-heading">${nomeCompleto}</strong>
              ${cidadeAtual ? `<span class="badge bg-light text-secondary border ms-1 small"><i class="bi bi-pin-map me-1"></i>${cidadeAtual}</span>` : ''}
            </div>
          </div>

          <!-- Bloco 2: Relógio Regional em Tempo Real -->
          <div class="senac-clock-card d-flex align-items-center gap-2 px-3 py-2 rounded-3 border" style="background-color: #f8fafc;" title="${dadosFuso.fuso}">
            <div class="text-primary d-flex align-items-center position-relative">
              <i class="bi bi-clock-fill fs-5"></i>
              <span class="position-absolute top-0 start-100 translate-middle p-1 bg-success border border-light rounded-circle" style="width: 8px; height: 8px;" title="Horário regional sincronizado ao vivo"></span>
            </div>
            <div class="lh-1">
              <div class="d-flex align-items-center gap-1">
                <span class="senac-live-time font-monospace fw-bold text-dark" style="font-size: 1.08rem; letter-spacing: 0.5px;">${dadosFuso.hora}</span>
                <span class="badge bg-primary text-white senac-live-timezone-badge" style="font-size: 0.65rem;" title="${dadosFuso.fuso}">${dadosFuso.sigla}</span>
              </div>
              <small class="text-muted d-block mt-1 senac-live-date text-capitalize" style="font-size: 0.72rem;">${dadosFuso.data}</small>
            </div>
          </div>

          <!-- Bloco 3: Ações Rápidas -->
          <div class="d-flex align-items-center gap-2">
            <button class="btn btn-sm btn-outline-primary fw-semibold" onclick="SenacLocalizacao.abrirModalSelecao()" title="Ver cursos de outro departamento">
              <i class="bi bi-arrow-repeat me-1"></i> Alterar Região
            </button>
            <button class="btn btn-sm btn-light border text-muted" onclick="SenacLocalizacao.detectarGPS(this)" title="Re-detectar localização via GPS">
              <i class="bi bi-crosshair"></i> GPS
            </button>
          </div>

        </div>
      `;

      iniciarRelogioRegional();
    }
  }

  // Exportação Global
  window.SenacLocalizacao = {
    getDepartamentoUsuario: () => getDepartamentoUsuario() || 'DR/BA',
    temDepartamentoDefinido: () => Boolean(getDepartamentoUsuario()),
    setDepartamentoUsuario,
    getNomeDepartamento,
    getInfoFusoDepartamento,
    getTimezoneAtual,
    getFusoDescAtual,
    getHorarioAtualFormatado,
    formatarDataHoraNoFuso,
    calcularTempoRelativo,
    iniciarRelogioRegional,
    solicitarGeolocalizacao,
    abrirModalSelecao,
    abrirPopupPermissao: () => {
      garantirModalPermissao();
      const modalEl = document.getElementById('modalPermissaoLocalizacao');
      if (modalEl && window.bootstrap && window.bootstrap.Modal) {
        modalPermissaoInstance = bootstrap.Modal.getOrCreateInstance(modalEl);
        modalPermissaoInstance.show();
      }
    },
    renderizarBarraOuBanner,
    detectarGPS: function (btnElement) {
      solicitarGeolocalizacao(btnElement, (res) => {
        if (modalSelecaoInstance) modalSelecaoInstance.hide();
        if (modalPermissaoInstance) modalPermissaoInstance.hide();
      });
    }
  };

  // Disparo automático do pop-up ao carregar a página
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', checarExibirPopupPermissao);
  } else {
    checarExibirPopupPermissao();
  }

})(window);
