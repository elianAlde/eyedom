window.Eyedom = window.Eyedom || {};

window.Eyedom.app = (() => {
  const { api, config, globe, ui } = window.Eyedom;

  async function init() {
    const elements = ui.init();

    globe.init(elements.globe);
    bindEvents();

    await loadEarthquakes();
    await loadDisasters();
    await loadGlobalNews(config.defaults.initialNewsFilter);
    await searchPlace(config.defaults.initialCity);
  }

  function bindEvents() {
    ui.bindSearch(searchPlace);
    ui.bindDetailDrawer();
    ui.bindNewsFilters(loadGlobalNews);
    ui.bindActions({
      'toggle-earthquakes': globe.toggleEarthquakes,
      'toggle-disasters': globe.toggleDisasters,
      'toggle-connections': globe.toggleConnections,
      'focus-europe': () => globe.focusRegion('europe'),
      'focus-usa': () => globe.focusRegion('usa')
    });
  }

  async function loadEarthquakes() {
    try {
      const earthquakes = await api.getRecentEarthquakes();

      globe.setEarthquakes(earthquakes);
      ui.renderEarthquakes(earthquakes, (item) => {
        globe.focusPoint(item.lat, item.lng);
        ui.showDetail(createEarthquakeDetail(item));
      });
      ui.setSourceStatus('usgs', 'ok', 'USGS OK');
    } catch (error) {
      ui.setEarthquakeError();
      ui.setSourceStatus('usgs', 'error', 'USGS OFF');
      console.error(error);
    }
  }

  async function loadDisasters() {
    try {
      const disasters = await api.getGdacsDisasters();

      globe.setDisasters(disasters);
      ui.renderDisasters(disasters, (item) => {
        globe.focusPoint(item.lat, item.lng);
        ui.showDetail(createDisasterDetail(item));
      });
      ui.setSourceStatus('gdacs', 'ok', 'GDACS OK');
    } catch (error) {
      ui.setDisasterError();
      ui.setSourceStatus('gdacs', 'error', 'GDACS OFF');
      console.error(error);
    }
  }

  async function loadGlobalNews(filterKey) {
    ui.setNewsFiltersDisabled(true);
    ui.setGlobalNewsLoading();

    try {
      const articles = await api.getGlobalNews(filterKey);

      ui.renderGlobalNews(articles, (item) => {
        ui.showDetail(createNewsDetail(item));
      });
      ui.setSourceStatus('gdelt', 'ok', 'GDELT OK');
    } catch (error) {
      ui.setGlobalNewsError();
      ui.setSourceStatus('gdelt', 'warning', 'GDELT LIMIT');
      console.error(error);
    } finally {
      ui.setNewsFiltersDisabled(false);
    }
  }

  async function searchPlace(query) {
    if (!query) return;

    ui.setWeatherStatus('Ricerca in corso...');

    try {
      const place = await api.searchPlace(query);

      if (!place) {
        ui.setWeatherStatus('Luogo non trovato');
        return;
      }

      globe.focusPoint(place.latitude, place.longitude);

      const currentWeather = await api.getCurrentWeather(place);
      ui.renderWeather(place, currentWeather);
      ui.setSourceStatus('meteo', 'ok', 'METEO OK');
    } catch (error) {
      ui.setWeatherStatus('Meteo non disponibile');
      ui.setSourceStatus('meteo', 'error', 'METEO OFF');
      console.error(error);
    }
  }

  function createEarthquakeDetail(item) {
    return {
      type: 'TERREMOTO',
      title: `M ${item.magnitude.toFixed(1)} - ${item.place}`,
      rows: [
        { label: 'Fonte', value: 'USGS' },
        { label: 'Magnitudo', value: item.magnitude.toFixed(1) },
        { label: 'Profondita', value: `${Math.round(item.depth)} km` },
        { label: 'Coordinate', value: `${item.lat.toFixed(3)}, ${item.lng.toFixed(3)}` },
        { label: 'Ora', value: item.time ? window.Eyedom.utils.formatDateTime(item.time) : 'n/d' }
      ],
      link: item.url
    };
  }

  function createDisasterDetail(item) {
    return {
      type: 'ALLERTA',
      title: `${item.typeLabel} - ${item.name}`,
      rows: [
        { label: 'Fonte', value: 'GDACS' },
        { label: 'Livello', value: item.alertLevel || 'n/d' },
        { label: 'Paese/area', value: item.country || 'n/d' },
        { label: 'Coordinate', value: `${item.lat.toFixed(3)}, ${item.lng.toFixed(3)}` },
        { label: 'Data', value: item.date ? window.Eyedom.utils.formatDateTime(item.date) : 'n/d' }
      ],
      link: item.url
    };
  }

  function createNewsDetail(item) {
    return {
      type: 'NOTIZIA',
      title: item.title,
      rows: [
        { label: 'Fonte', value: item.domain },
        { label: 'Paese fonte', value: item.sourceCountry || 'n/d' },
        { label: 'Lingua', value: item.language || 'n/d' },
        { label: 'Vista', value: item.publishedAt ? window.Eyedom.utils.formatDateTime(item.publishedAt) : 'n/d' }
      ],
      description: 'Segnale news da GDELT. Verifica sempre la fonte originale prima di considerarlo confermato.',
      link: item.url
    };
  }

  return {
    init
  };
})();

document.addEventListener('DOMContentLoaded', window.Eyedom.app.init);
