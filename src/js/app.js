window.Eyedom = window.Eyedom || {};

window.Eyedom.app = (() => {
    const { api, config, globe, ui } = window.Eyedom;

    async function init() {
        const elements = ui.init();

        globe.init(elements.globe);
        bindEvents();

        await Promise.all([
            loadEarthquakes(),
            loadDisasters(),
            loadGlobalNews(config.defaults.initialNewsFilter),
            searchPlace(config.defaults.initialCity)
        ]);
    }

    function bindEvents() {
        ui.bindSearch(searchPlace);
        ui.bindDetailDrawer();
        ui.bindNewsFilters(loadGlobalNews);
        ui.bindFlightSearch(searchFlight);

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
            const articles = await api.getGlobalNews(filterKey, ui.setGlobalNewsRetrying);

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

        ui.setWeatherStatus('Searching...');

        try {
            const place = await api.searchPlace(query);

            if (!place) {
                ui.setWeatherStatus('Location not found');
                return;
            }

            globe.focusPoint(place.latitude, place.longitude);

            const currentWeather = await api.getCurrentWeather(place);

            ui.renderWeather(place, currentWeather);
            ui.setSourceStatus('meteo', 'ok', 'WEATHER OK');

        } catch (error) {
            ui.setWeatherStatus('Weather unavailable');
            ui.setSourceStatus('meteo', 'error', 'WEATHER OFF');
            console.error(error);
        }
    }

    async function searchFlight(query) {
        if (!query) return;

        ui.setFlightSearching();

        try {
            const flight = await api.searchFlight(query);

            ui.renderFlightResult(flight);
            ui.setSourceStatus('flights', 'ok', 'FLIGHTS OK');

            if (flight && flight.lat !== null && flight.lng !== null) {
                globe.setFlight(createFlightPoint(flight));
                globe.focusPoint(flight.lat, flight.lng, 1.6);
            } else {
                globe.clearFlight();
            }
        } catch (error) {
            ui.setFlightSearchError('Flight data unavailable');
            ui.setSourceStatus('flights', 'error', 'FLIGHTS OFF');
            console.error(error);
        }
    }

    function createFlightPoint(flight) {
        return {
            lat: flight.lat,
            lng: flight.lng,
            size: 0.24,
            color: '#50ff8c',
            label: `
                <strong>${flight.callsign || 'Unknown flight'}</strong><br>
                ${flight.aircraftType || ''}<br>
                Alt: ${flight.altitude != null ? `${Math.round(flight.altitude)} ft` : 'n/a'}
            `
        };
    }

    function createEarthquakeDetail(item) {
        return {
            type: 'EARTHQUAKE',
            title: `M ${item.magnitude.toFixed(1)} - ${item.place}`,
            rows: [
                {
                    label: 'Source',
                    value: 'USGS'
                },
                {
                    label: 'Magnitude',
                    value: item.magnitude.toFixed(1)
                },
                {
                    label: 'Depth',
                    value: `${Math.round(item.depth)} km`
                },
                {
                    label: 'Coordinates',
                    value: `${item.lat.toFixed(3)}, ${item.lng.toFixed(3)}`
                },
                {
                    label: 'Time',
                    value: item.time
                        ? window.Eyedom.utils.formatDateTime(item.time)
                        : 'n/a'
                }
            ],
            link: item.url
        };
    }

    function createDisasterDetail(item) {
        return {
            type: 'ALERT',
            title: `${item.typeLabel} - ${item.name}`,
            rows: [
                {
                    label: 'Source',
                    value: 'GDACS'
                },
                {
                    label: 'Severity',
                    value: item.alertLevel || 'n/a'
                },
                {
                    label: 'Country / Area',
                    value: item.country || 'n/a'
                },
                {
                    label: 'Coordinates',
                    value: `${item.lat.toFixed(3)}, ${item.lng.toFixed(3)}`
                },
                {
                    label: 'Date',
                    value: item.date
                        ? window.Eyedom.utils.formatDateTime(item.date)
                        : 'n/a'
                }
            ],
            link: item.url
        };
    }

    function createNewsDetail(item) {
        return {
            type: 'NEWS',
            title: item.title,
            rows: [
                {
                    label: 'Source',
                    value: item.domain
                },
                {
                    label: 'Source Country',
                    value: item.sourceCountry || 'n/a'
                },
                {
                    label: 'Language',
                    value: item.language || 'n/a'
                },
                {
                    label: 'Published',
                    value: item.publishedAt
                        ? window.Eyedom.utils.formatDateTime(item.publishedAt)
                        : 'n/a'
                }
            ],
            description:
                'News signal from GDELT. Always verify the original source before considering the information confirmed.',
            link: item.url
        };
    }

    return {
        init
    };

})();

document.addEventListener(
    'DOMContentLoaded',
    window.Eyedom.app.init
);