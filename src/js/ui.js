window.Eyedom = window.Eyedom || {};

window.Eyedom.ui = (() => {
	const { config, utils } = window.Eyedom;

	const selectors = {
		globe: 'globeViz',
		earthquakeList: 'earthquakeList',
		disasterList: 'disasterList',
		globalNewsList: 'globalNewsList',
		newsFilters: 'newsFilters',
		detailDrawer: 'detailDrawer',
		detailType: 'detailType',
		detailTitle: 'detailTitle',
		detailBody: 'detailBody',
		detailClose: 'detailClose',
		searchInput: 'searchInput',
		weatherIcon: 'weatherIcon',
		weatherTemp: 'weatherTemp',
		weatherSummary: 'weatherSummary',
		weatherHumidity: 'weatherHumidity',
		weatherWind: 'weatherWind',
		weatherPressure: 'weatherPressure',
		flightSearchInput: 'flightSearchInput',
		flightSearchButton: 'flightSearchButton',
		flightResult: 'flightResult'
	};

	const elements = {};

	function init() {
		Object.entries(selectors).forEach(([key, id]) => {
			elements[key] = document.getElementById(id);
		});

		return elements;
	}

	function renderEarthquakes(items, onSelect) {
		const visibleItems = items.slice(0, config.defaults.visibleEarthquakeItems);

		elements.earthquakeList.innerHTML = '';

		visibleItems.forEach((item) => {
			const button = document.createElement('button');
			button.className = 'earthquake';
			button.type = 'button';
			button.innerHTML = `
				<span class="mag">M ${item.magnitude.toFixed(1)}</span>
				<span>${item.place}</span>
				<small>${utils.formatDateTime(item.time)}</small>
			`;
			button.addEventListener('click', () => onSelect(item));

			elements.earthquakeList.append(button);
		});
	}

	function renderDisasters(items, onSelect) {
		const visibleItems = items.slice(0, config.defaults.visibleDisasterItems);

		elements.disasterList.innerHTML = '';

		if (!visibleItems.length) {
			elements.disasterList.innerHTML =
				'<div class="feed-item">No recent GDACS alerts</div>';
			return;
		}

		visibleItems.forEach((item) => {
			const button = document.createElement('button');
			button.className = 'disaster';
			button.type = 'button';
			button.innerHTML = `
				<span class="alert-dot" style="background:${item.color}"></span>
				<span>
				<strong>${item.typeLabel}</strong>
				${item.name}
				</span>
				<small>${renderDisasterMeta(item)}</small>
			`;
			button.addEventListener('click', () => onSelect(item));

			elements.disasterList.append(button);
		});
	}

	function renderDisasterMeta(item) {
		const details = [
		item.alertLevel ? `Alert ${item.alertLevel}` : '',
		item.country,
		item.date ? utils.formatDateTime(item.date) : ''
		].filter(Boolean);

		return details.join(' · ');
	}

	function renderGlobalNews(items, onSelect) {
		const visibleItems = items.slice(0, config.defaults.visibleNewsItems);

		elements.globalNewsList.innerHTML = '';

		visibleItems.forEach((item) => {
			const article = document.createElement('article');
			article.className = item.image ? 'news-item' : 'news-item no-image';
			article.tabIndex = 0;

			article.innerHTML = `
				${item.image ? `<img src="${item.image}" alt="" loading="lazy">` : ''}
				<div>
				<a href="${item.url}" target="_blank" rel="noopener noreferrer">
					${item.title}
				</a>
				<small>
					${renderNewsMeta(item)}
				</small>
				</div>
			`;
			article.addEventListener('click', (event) => {
				if (event.target.closest('a')) return;
				onSelect(item);
			});
			article.addEventListener('keydown', (event) => {
				if (event.key === 'Enter') {
					onSelect(item);
				}
			});

			elements.globalNewsList.append(article);
		});
	}

	function setGlobalNewsLoading() {
		elements.globalNewsList.innerHTML = '<div class="feed-item">Loading GDELT news...</div>';
	}

	function setGlobalNewsRetrying() {
		elements.globalNewsList.innerHTML = '<div class="feed-item">GDELT rate limit hit, retrying...</div>';
	}

	function setNewsFiltersDisabled(disabled) {
		elements.newsFilters.querySelectorAll('[data-news-filter]').forEach((button) => {
			button.disabled = disabled;
		});
	}

	function renderNewsMeta(item) {
		const details = [
		item.domain,
		item.sourceCountry,
		item.language,
		item.publishedAt ? utils.formatDateTime(item.publishedAt) : ''
		].filter(Boolean);

		return details.join(' · ');
	}

	function renderWeather(place, current) {
		elements.weatherIcon.textContent = utils.getWeatherIcon(current.weather_code);
		elements.weatherTemp.textContent = `${Math.round(current.temperature_2m)}°C`;
		elements.weatherSummary.textContent = `${place.name}, ${place.country}`;
		elements.weatherHumidity.textContent = `${current.relative_humidity_2m}%`;
		elements.weatherWind.textContent = `${Math.round(current.wind_speed_10m)} km/h`;
		elements.weatherPressure.textContent = `${Math.round(current.pressure_msl)} hPa`;
	}

	function setWeatherStatus(message) {
		elements.weatherSummary.textContent = message;
	}

	function setFlightSearching() {
		elements.flightResult.innerHTML = '<p class="muted">Searching...</p>';
	}

	function renderFlightResult(flight) {
		if (!flight) {
			elements.flightResult.innerHTML =
				'<p class="muted">No live flight found with that number.</p>';
			return;
		}

		elements.flightResult.innerHTML = `
			<div class="flight-info">
				<strong>${flight.callsign || 'n/a'}</strong>
				<span class="muted">${flight.aircraftType || ''}</span>
			</div>
			<div class="stats">
				<div class="stat">
					<span>Altitude</span>
					<strong>${flight.onGround ? 'Ground' : (flight.altitude != null ? `${Math.round(flight.altitude)} ft` : 'n/a')}</strong>
				</div>
				<div class="stat">
					<span>Speed</span>
					<strong>${flight.speedKmh != null ? `${Math.round(flight.speedKmh)} km/h` : 'n/a'}</strong>
				</div>
				<div class="stat">
					<span>Heading</span>
					<strong>${flight.heading != null ? `${Math.round(flight.heading)}°` : 'n/a'}</strong>
				</div>
			</div>
		`;
	}

	function setFlightSearchError(message) {
		elements.flightResult.innerHTML = `<p class="muted error">${utils.escapeHtml(message)}</p>`;
	}

	function bindFlightSearch(onSearch) {
		elements.flightSearchButton.addEventListener('click', () => {
			onSearch(elements.flightSearchInput.value.trim());
		});

		elements.flightSearchInput.addEventListener('keydown', (event) => {
			if (event.key === 'Enter') {
				onSearch(elements.flightSearchInput.value.trim());
			}
		});
	}

	function setEarthquakeError() {
		elements.earthquakeList.innerHTML = '<div class="feed-item error">USGS unavailable</div>';
	}

	function setDisasterError() {
		elements.disasterList.innerHTML = '<div class="feed-item error">GDACS alerts unavailable</div>';
	}

	function setGlobalNewsError() {
		elements.globalNewsList.innerHTML = '<div class="feed-item error">GDELT is temporarily rate-limited. Try again in a minute.</div>';
	}

	function showDetail(detail) {
		elements.detailType.textContent = detail.type;
		elements.detailTitle.textContent = detail.title;
		elements.detailBody.innerHTML = `
			<div class="detail-grid">
				${detail.rows.map((row) => `
				<div>
					<span>${row.label}</span>
					<strong>${row.value}</strong>
				</div>
				`).join('')}
			</div>
			${detail.description ? `<p>${detail.description}</p>` : ''}
			${detail.link ? `
				<a class="detail-link" href="${detail.link}" target="_blank" rel="noopener noreferrer">
				Apri fonte originale
				</a>
			` : ''}
		`;
		elements.detailDrawer.classList.add('open');
		elements.detailDrawer.setAttribute('aria-hidden', 'false');
	}

	function hideDetail() {
		elements.detailDrawer.classList.remove('open');
		elements.detailDrawer.setAttribute('aria-hidden', 'true');
	}

	function setSourceStatus(source, state, label) {
		const element = document.querySelector(`[data-source-status="${source}"]`);

		if (!element) return;

		element.className = `source-pill ${state}`;
		element.textContent = label;
	}

	function bindSearch(onSearch) {
		elements.searchInput.addEventListener('keydown', (event) => {
			if (event.key === 'Enter') {
				onSearch(elements.searchInput.value.trim());
			}
		});
	}

	function bindDetailDrawer() {
		elements.detailClose.addEventListener('click', hideDetail);
		document.addEventListener('keydown', (event) => {
			if (event.key === 'Escape') {
				hideDetail();
			}
		});
	}

	function bindNewsFilters(onFilter) {
		elements.newsFilters.addEventListener('click', (event) => {
			const button = event.target.closest('[data-news-filter]');

			if (!button) return;

			elements.newsFilters.querySelectorAll('[data-news-filter]').forEach((item) => {
				item.classList.toggle('active', item === button);
			});

			onFilter(button.dataset.newsFilter);
		});
	}

	function bindActions(actions) {
		document.querySelectorAll('[data-action]').forEach((button) => {
			button.addEventListener('click', () => {
				const action = actions[button.dataset.action];

				if (action) {
					action();
				}
			});
		});
	}

	return {
		init,
		renderEarthquakes,
		renderDisasters,
		renderGlobalNews,
		renderWeather,
		renderFlightResult,
		showDetail,
		hideDetail,
		setSourceStatus,
		setGlobalNewsLoading,
		setGlobalNewsRetrying,
		setNewsFiltersDisabled,
		setWeatherStatus,
		setEarthquakeError,
		setDisasterError,
		setGlobalNewsError,
		setFlightSearching,
		setFlightSearchError,
		bindSearch,
		bindDetailDrawer,
		bindNewsFilters,
		bindFlightSearch,
		bindActions,
		elements
	};
})();
