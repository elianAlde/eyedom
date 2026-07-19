window.Eyedom = window.Eyedom || {};

window.Eyedom.api = (() => {
const { config, utils } = window.Eyedom;

async function fetchJson(url) {
	const response = await fetch(url);

	if (!response.ok) {
		throw new Error(`Request failed: ${response.status}`);
	}

	return response.json();
}

function fetchJsonp(url, callbackParam = 'callback') {
	return new Promise((resolve, reject) => {
		const callbackName = `eyedomJsonp_${Date.now()}_${Math.random().toString(36).slice(2)}`;
		const script = document.createElement('script');
		const timeout = window.setTimeout(() => {
			cleanup();
			reject(new Error('JSONP request timed out'));
		}, 12000);

		function cleanup() {
			window.clearTimeout(timeout);
			script.remove();
			delete window[callbackName];
		}

		window[callbackName] = (data) => {
			cleanup();
			resolve(data);
		};

		url.searchParams.set(callbackParam, callbackName);
		script.src = url.href;
		script.async = true;
		script.onerror = () => {
			cleanup();
			reject(new Error('JSONP request failed'));
		};

		document.head.append(script);
	});
}

async function getRecentEarthquakes() {
	const data = await fetchJson(config.sources.usgsEarthquakes);

	if (!Array.isArray(data.features)) {
		throw new Error('Invalid USGS payload');
	}

	return data.features
	.filter((feature) => feature.geometry && feature.geometry.coordinates)
	.slice(0, config.defaults.maxEarthquakePoints)
	.map(normalizeEarthquake);
}

function wait(ms) {
	return new Promise((resolve) => window.setTimeout(resolve, ms));
}

function buildGdeltUrl(filterKey) {
	const url = new URL(config.sources.gdeltDoc);
	const filter = config.newsFilters[filterKey] || config.newsFilters.global;

	url.searchParams.set('query', filter.query);
	url.searchParams.set('mode', 'artlist');
	url.searchParams.set('format', 'jsonp');
	url.searchParams.set('timespan', '24h');
	url.searchParams.set('maxrecords', '20');
	url.searchParams.set('sort', 'hybridrel');

	return url;
}

async function getGlobalNews(filterKey = config.defaults.initialNewsFilter, onRetry) {
	const cacheKey = `eyedom:gdelt:${filterKey}`;
	const cachedArticles = utils.readCache(cacheKey, config.defaults.newsCacheMinutes);

	if (cachedArticles) {
		return cachedArticles.map(hydrateNewsArticle);
	}

	let data;

	try {
		data = await fetchJsonp(buildGdeltUrl(filterKey));
	} catch (firstError) {
		if (onRetry) onRetry();

		await wait(6000);

		try {
			data = await fetchJsonp(buildGdeltUrl(filterKey));
		} catch (secondError) {
			const staleArticles = utils.readStaleCache(cacheKey);

			if (staleArticles) {
				return staleArticles.map(hydrateNewsArticle);
			}

			throw secondError;
		}
	}

	if (!Array.isArray(data.articles)) {
		throw new Error('Invalid GDELT payload');
	}

	const articles = data.articles
	.map(normalizeNewsArticle)
	.filter((article) => article.url && article.title)
	.filter(uniqueByUrl);

	utils.writeCache(cacheKey, articles);

	return articles;
}

async function getGdacsDisasters() {
	const url = new URL(config.sources.gdacsEvents);
	const toDate = new Date();
	const fromDate = new Date();

	fromDate.setDate(toDate.getDate() - 30);

	url.searchParams.set('eventlist', 'EQ;TC;FL;VO;DR;WF');
	url.searchParams.set('alertlevel', 'red;orange;green');
	url.searchParams.set('fromdate', utils.formatDateParam(fromDate));
	url.searchParams.set('todate', utils.formatDateParam(toDate));
	url.searchParams.set('pagesize', String(config.defaults.maxDisasterPoints));

	const data = await fetchJson(url);

	if (!Array.isArray(data.features)) {
		throw new Error('Invalid GDACS payload');
	}

	return data.features
	.map(normalizeDisaster)
	.filter((event) => Number.isFinite(event.lat) && Number.isFinite(event.lng));
}

	function normalizeDisaster(feature) {
		const properties = feature.properties || {};
		const coordinates = getGeometryPoint(feature.geometry);
		const eventType = properties.eventtype || properties.eventType || properties.event_type || '';
		const alertLevel = properties.alertlevel || properties.alertLevel || properties.alert_level || properties.episodealertlevel || '';
		const typeLabel = utils.getDisasterTypeLabel(eventType);
		const name = properties.name || properties.eventname || properties.eventName || properties.title || properties.description || typeLabel;
		const country = properties.country || properties.countryname || properties.iso3 || '';

		return {
			lat: coordinates ? coordinates.lat : null,
			lng: coordinates ? coordinates.lng : null,
			eventType,
			alertLevel,
			typeLabel,
			name: utils.escapeHtml(name),
			country: utils.escapeHtml(country),
			date: parseFlexibleDate(
				properties.todate ||
				properties.fromdate ||
				properties.date ||
				properties.datetime
			),
			size: getAlertSize(alertLevel),
			color: utils.getAlertColor(alertLevel),
			label: `
				<strong>${typeLabel}</strong><br>
				${utils.escapeHtml(name)}<br>
				Alert: ${utils.escapeHtml(alertLevel || 'n/d')}
			`,
			url: utils.toSafeUrl(
				properties.url ||
				properties.link ||
				properties.reporturl ||
				properties.detailsurl ||
				''
			)
		};
	}

	function getGeometryPoint(geometry) {
		if (!geometry || !geometry.coordinates) return null;

		if (geometry.type === 'Point') {
			return {
				lng: Number(geometry.coordinates[0]),
				lat: Number(geometry.coordinates[1])
			};
		}

		const points = flattenCoordinates(geometry.coordinates)
		.filter((point) => point.length >= 2)
		.map((point) => ({
			lng: Number(point[0]),
			lat: Number(point[1])
		}))
		.filter((point) => Number.isFinite(point.lat) && Number.isFinite(point.lng));

		if (!points.length) return null;

		return {
			lat: points.reduce((sum, point) => sum + point.lat, 0) / points.length,
			lng: points.reduce((sum, point) => sum + point.lng, 0) / points.length
		};
	}

	function flattenCoordinates(value) {
		if (!Array.isArray(value)) return [];

		if (typeof value[0] === 'number') {
		return [value];
		}

		return value.flatMap(flattenCoordinates);
	}

	function getAlertSize(alertLevel) {
		const level = String(alertLevel || '').toLowerCase();

		if (level.includes('red')) return 0.36;
		if (level.includes('orange')) return 0.26;

		return 0.16;
	}

	function parseFlexibleDate(value) {
		if (!value) return null;

		const date = new Date(value);

		return Number.isNaN(date.getTime()) ? null : date;
	}

	function normalizeNewsArticle(article) {
		return {
		title: utils.escapeHtml(article.title),
		url: utils.toSafeUrl(article.url),
		domain: utils.escapeHtml(article.domain || 'Source not indicated'),
		sourceCountry: utils.escapeHtml(article.sourcecountry || ''),
		language: utils.escapeHtml(article.language || ''),
		image: utils.toSafeUrl(article.socialimage || ''),
		publishedAt: parseGdeltDate(article.seendate)
		};
	}

	function hydrateNewsArticle(article) {
		return {
		...article,
		publishedAt: article.publishedAt ? new Date(article.publishedAt) : null
		};
	}

	function uniqueByUrl(article, index, articles) {
		return articles.findIndex((item) => item.url === article.url) === index;
	}

	function parseGdeltDate(value) {
		if (!value) return null;

		const normalized = String(value).replace(
		/^(\d{4})(\d{2})(\d{2})T(\d{2})(\d{2})(\d{2})Z$/,
		'$1-$2-$3T$4:$5:$6Z'
		);
		const date = new Date(normalized);

		return Number.isNaN(date.getTime()) ? null : date;
	}

	function normalizeEarthquake(feature) {
		const [lng, lat, depth] = feature.geometry.coordinates;
		const properties = feature.properties || {};
		const magnitude = properties.mag || 0;
		const place = utils.escapeHtml(properties.place || 'Unspecified area');

		return {
		lat,
		lng,
		depth,
		magnitude,
		size: Math.max(0.08, magnitude * 0.08),
		color: utils.getMagnitudeColor(magnitude),
		place,
		time: new Date(properties.time),
		url: utils.toSafeUrl(properties.url),
		label: `
			<strong>M ${magnitude.toFixed(1)}</strong><br>
			${place}<br>
			Depth: ${Math.round(depth)} km
		`
		};
	}

	async function searchPlace(query) {
		const url = new URL(config.sources.openMeteoGeocoding);

		url.searchParams.set('name', query);
		url.searchParams.set('count', '1');
		url.searchParams.set('language', 'it');
		url.searchParams.set('format', 'json');

		const data = await fetchJson(url);

		return data.results && data.results[0] ? data.results[0] : null;
	}

	async function searchFlight(query) {
		const callsign = String(query || '').trim().toUpperCase();

		if (!callsign) return null;

		const url = `${config.sources.flightCallsign}${encodeURIComponent(callsign)}`;
		const data = await fetchJson(url);

		if (!Array.isArray(data.ac) || !data.ac.length) {
			return null;
		}

		return normalizeFlight(data.ac[0]);
	}

	function normalizeFlight(aircraft) {
		const rawAltitude = aircraft.alt_geom ?? aircraft.alt_baro;

		return {
			icao24: aircraft.hex || '',
			callsign: utils.escapeHtml((aircraft.flight || '').trim()),
			aircraftType: utils.escapeHtml(aircraft.t || ''),
			lat: typeof aircraft.lat === 'number' ? aircraft.lat : null,
			lng: typeof aircraft.lon === 'number' ? aircraft.lon : null,
			altitude: typeof rawAltitude === 'number' ? rawAltitude : null,
			onGround: rawAltitude === 'ground',
			speedKmh: typeof aircraft.gs === 'number' ? aircraft.gs * 1.852 : null,
			heading: typeof aircraft.track === 'number' ? aircraft.track : null
		};
	}

	async function getCurrentWeather(place) {
		const url = new URL(config.sources.openMeteoForecast);

		url.searchParams.set('latitude', place.latitude);
		url.searchParams.set('longitude', place.longitude);
		url.searchParams.set(
		'current',
		'temperature_2m,relative_humidity_2m,apparent_temperature,weather_code,wind_speed_10m,pressure_msl'
		);

		const data = await fetchJson(url);

		if (!data.current) {
			throw new Error('Invalid Open-Meteo payload');
		}

		return data.current;
	}

	return {
		getRecentEarthquakes,
		getGdacsDisasters,
		getGlobalNews,
		searchPlace,
		getCurrentWeather,
		searchFlight
	};
})();
