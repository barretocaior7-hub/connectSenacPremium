// public/js/google-maps.js
// Integração Oficial do Google Maps Platform no Connect Senac

(function (window) {
  'use strict';

  // Configuração padrão da unidade SENAC Santo Antônio de Jesus
  const SENAC_LOCATION = {
    nome: 'SENAC - Santo Antônio de Jesus',
    endereco: 'Rua Dois de Julho, 05 - Centro, Santo Antônio de Jesus - BA, 44572-005',
    lat: -12.965733710857474,
    lng: -39.26765047467337,
    placeId: 'ChIJz2QyZ0hEFwcR3K97e704H2Q'
  };

  // Chave da API do Google Cloud (Pode ser preenchida via window.GOOGLE_MAPS_API_KEY ou variável global)
  const GOOGLE_MAPS_API_KEY = window.GOOGLE_MAPS_API_KEY || '';

  let mapInstance = null;
  let markerInstance = null;

  /**
   * Abre o Google Maps com a rota traçada a partir da localização do usuário
   */
  function abrirGoogleMapsRota(destLat, destLng, localNome) {
    const lat = destLat || SENAC_LOCATION.lat;
    const lng = destLng || SENAC_LOCATION.lng;
    const nome = encodeURIComponent(localNome || SENAC_LOCATION.nome);
    
    // URL Universal do Google Maps Directions API
    const url = `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}&destination_place_id=${SENAC_LOCATION.placeId}&travelmode=driving`;
    window.open(url, '_blank', 'noopener,noreferrer');
  }

  /**
   * Abre a navegação no aplicativo Waze
   */
  function abrirWazeRota(destLat, destLng) {
    const lat = destLat || SENAC_LOCATION.lat;
    const lng = destLng || SENAC_LOCATION.lng;
    const url = `https://waze.com/ul?ll=${lat},${lng}&navigate=yes`;
    window.open(url, '_blank', 'noopener,noreferrer');
  }

  /**
   * Copia o endereço da unidade para a área de transferência
   */
  async function copiarEnderecoSenac(btnElement) {
    const texto = SENAC_LOCATION.endereco;
    try {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(texto);
      } else {
        const textarea = document.createElement('textarea');
        textarea.value = texto;
        document.body.appendChild(textarea);
        textarea.select();
        document.execCommand('copy');
        document.body.removeChild(textarea);
      }

      if (btnElement) {
        const originalHtml = btnElement.innerHTML;
        btnElement.classList.add('btn-success', 'text-white');
        btnElement.classList.remove('btn-outline-secondary', 'btn-light');
        btnElement.innerHTML = '<i class="bi bi-check2 me-1"></i> Endereço Copiado!';
        setTimeout(() => {
          btnElement.innerHTML = originalHtml;
          btnElement.classList.remove('btn-success', 'text-white');
          btnElement.classList.add('btn-outline-secondary');
        }, 2500);
      }
    } catch (err) {
      console.error('Falha ao copiar endereço:', err);
    }
  }

  /**
   * Calcula distância linear e tempo estimado usando Geolocation do navegador
   */
  function calcularDistanciaAteSenac(containerId) {
    const container = document.getElementById(containerId);
    if (!container) return;

    if (!('geolocation' in navigator)) {
      container.innerHTML = '<span class="text-muted"><i class="bi bi-info-circle me-1"></i> Geolocalização não suportada no seu navegador.</span>';
      container.classList.remove('d-none');
      return;
    }

    container.innerHTML = '<span class="text-muted"><span class="spinner-border spinner-border-sm me-1" role="status"></span> Calculando sua distância até o SENAC...</span>';
    container.classList.remove('d-none');

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const userLat = pos.coords.latitude;
        const userLng = pos.coords.longitude;

        // Fórmula de Haversine para cálculo de distância geodésica em KM
        const R = 6371; // Raio da Terra em km
        const dLat = (SENAC_LOCATION.lat - userLat) * Math.PI / 180;
        const dLng = (SENAC_LOCATION.lng - userLng) * Math.PI / 180;
        const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
                  Math.cos(userLat * Math.PI / 180) * Math.cos(SENAC_LOCATION.lat * Math.PI / 180) *
                  Math.sin(dLng / 2) * Math.sin(dLng / 2);
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
        const distanciaKm = R * c;

        let tempoCarroMin = Math.round((distanciaKm / 35) * 60); // Média urbana de 35km/h
        if (tempoCarroMin < 2) tempoCarroMin = 2;

        let distanciaFormatada = distanciaKm < 1 
          ? `${Math.round(distanciaKm * 1000)} metros` 
          : `${distanciaKm.toFixed(1)} km`;

        container.innerHTML = `
          <div class="alert alert-primary bg-primary-subtle border-primary-subtle text-primary-emphasis py-2 px-3 rounded-3 small d-flex flex-wrap align-items-center justify-content-between gap-2 shadow-sm my-2">
            <div class="d-flex align-items-center gap-2">
              <i class="bi bi-geo-alt-fill fs-5 text-danger"></i>
              <div>
                <strong>Você está a aproximadamente ${distanciaFormatada} do SENAC</strong>
                <span class="d-block text-muted" style="font-size: 0.78rem;">Tempo estimado de carro: ~${tempoCarroMin} min</span>
              </div>
            </div>
            <button type="button" class="btn btn-sm btn-primary fw-semibold" onclick="GoogleMapsSenac.abrirRota()">
              <i class="bi bi-compass me-1"></i> Iniciar Rota no GPS
            </button>
          </div>
        `;
      },
      (err) => {
        container.innerHTML = `
          <div class="text-muted small py-1">
            <i class="bi bi-geo-alt me-1"></i> Ative o GPS para calcular a distância e o tempo até a unidade.
          </div>
        `;
      },
      { timeout: 10000, enableHighAccuracy: false }
    );
  }

  /**
   * Inicializa o Mapa Interativo do Google caso a API Key esteja disponível
   */
  function inicializarMapaInterativo(elementId) {
    const mapElement = document.getElementById(elementId);
    if (!mapElement) return;

    if (typeof google !== 'undefined' && google.maps) {
      const senacCoords = { lat: SENAC_LOCATION.lat, lng: SENAC_LOCATION.lng };

      mapInstance = new google.maps.Map(mapElement, {
        center: senacCoords,
        zoom: 17,
        disableDefaultUI: false,
        zoomControl: true,
        streetViewControl: true,
        fullscreenControl: true
      });

      markerInstance = new google.maps.Marker({
        position: senacCoords,
        map: mapInstance,
        title: SENAC_LOCATION.nome,
        animation: google.maps.Animation.DROP
      });

      const infoWindow = new google.maps.InfoWindow({
        content: `
          <div style="font-family: inherit; padding: 6px; max-width: 240px;">
            <div style="display: flex; align-items: center; gap: 6px; margin-bottom: 4px;">
              <strong style="color: #004a8d; font-size: 13px;">${SENAC_LOCATION.nome}</strong>
            </div>
            <p style="font-size: 11px; color: #64748b; margin-bottom: 8px;">${SENAC_LOCATION.endereco}</p>
            <a href="https://www.google.com/maps/dir/?api=1&destination=${SENAC_LOCATION.lat},${SENAC_LOCATION.lng}" target="_blank" style="display: inline-block; background: #f29100; color: white; padding: 4px 10px; border-radius: 6px; font-size: 11px; text-decoration: none; font-weight: bold;">
              Como Chegar
            </a>
          </div>
        `
      });

      markerInstance.addListener('click', () => {
        infoWindow.open(mapInstance, markerInstance);
      });

      infoWindow.open(mapInstance, markerInstance);
    }
  }

  /**
   * Carrega o SDK do Google Maps caso uma API Key seja injetada
   */
  function carregarSdkGoogleMaps(apiKey, callback) {
    if (typeof google !== 'undefined' && google.maps) {
      if (callback) callback();
      return;
    }

    if (!apiKey) return;

    const script = document.createElement('script');
    script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&libraries=places,geometry&loading=async`;
    script.async = true;
    script.defer = true;
    script.onload = () => {
      if (callback) callback();
    };
    document.head.appendChild(script);
  }

  // Exportação Global
  window.GoogleMapsSenac = {
    location: SENAC_LOCATION,
    abrirRota: (lat, lng, nome) => abrirGoogleMapsRota(lat, lng, nome),
    abrirWaze: (lat, lng) => abrirWazeRota(lat, lng),
    copiarEndereco: (btn) => copiarEnderecoSenac(btn),
    calcularDistancia: (containerId) => calcularDistanciaAteSenac(containerId),
    inicializarMapa: (elementId) => inicializarMapaInterativo(elementId),
    carregarSdk: (apiKey, callback) => carregarSdkGoogleMaps(apiKey, callback)
  };

  // Inicialização automática ao carregar o DOM
  document.addEventListener('DOMContentLoaded', () => {
    // Se existir container de distância na página, inicia o cálculo
    if (document.getElementById('distanciaSenacWrapper')) {
      calcularDistanciaAteSenac('distanciaSenacWrapper');
    }

    // Se houver chave definida e container interativo
    if (GOOGLE_MAPS_API_KEY && document.getElementById('mapaGoogleInterativo')) {
      carregarSdkGoogleMaps(GOOGLE_MAPS_API_KEY, () => {
        inicializarMapaInterativo('mapaGoogleInterativo');
      });
    }
  });

})(window);
