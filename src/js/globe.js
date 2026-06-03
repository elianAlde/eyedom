window.Eyedom = window.Eyedom || {};

window.Eyedom.globe = (() => {
    const { config } = window.Eyedom;

    const state = {
        world: null,

        earthquakes: [],

        disasters: [],

        connections: [
            {
                startLat: 41.9,
                startLng: 12.5,
                endLat: 40.7,
                endLng: -74.0,
                color: ['#00ffff', '#ff00ff']
            },
            {
                startLat: 35.6,
                startLng: 139.7,
                endLat: 37.77,
                endLng: -122.41,
                color: ['#ffaa00', '#ff0000']
            }
        ],

        earthquakesVisible: true,
        disastersVisible: true,
        connectionsVisible: true
    };

    function init(container) {

        state.world = Globe()(container)
            .globeImageUrl(config.globe.imageUrl)
            .bumpImageUrl(config.globe.bumpImageUrl)
            .backgroundImageUrl(config.globe.backgroundImageUrl)
            .backgroundColor('#000')
            .pointsData([])
            .pointAltitude('size')
            .pointColor('color')
            .pointLabel('label')
            .arcsData(state.connections)
            .arcColor('color')
            .arcDashLength(0.4)
            .arcDashGap(4)
            .arcDashAnimateTime(2500);

        state.world.controls().autoRotate = true;
        state.world.controls().autoRotateSpeed =
            config.globe.autoRotateSpeed;

        state.world.atmosphereColor(
            config.globe.atmosphereColor
        );

        state.world.atmosphereAltitude(
            config.globe.atmosphereAltitude
        );

        return state.world;
    }

    function setEarthquakes(earthquakes) {
        state.earthquakes = earthquakes;
        syncPoints();
    }

    function setDisasters(disasters) {
        state.disasters = disasters;
        syncPoints();
    }

    function toggleEarthquakes() {
        state.earthquakesVisible =
            !state.earthquakesVisible;

        syncPoints();

        return state.earthquakesVisible;
    }

    function toggleDisasters() {
        state.disastersVisible =
            !state.disastersVisible;

        syncPoints();

        return state.disastersVisible;
    }

    function syncPoints() {

        const points = [
            ...(state.earthquakesVisible
                ? state.earthquakes
                : []),

            ...(state.disastersVisible
                ? state.disasters
                : [])
        ];

        state.world.pointsData(points);
    }

    function toggleConnections() {

        state.connectionsVisible =
            !state.connectionsVisible;

        state.world.arcsData(
            state.connectionsVisible
                ? state.connections
                : []
        );

        return state.connectionsVisible;
    }

    function focusPoint(
        lat,
        lng,
        altitude = 1.35
    ) {
        state.world.pointOfView(
            {
                lat,
                lng,
                altitude
            },
            1200
        );
    }

    function focusRegion(region) {

        const target = config.focus[region];

        if (!target) {
            return;
        }

        state.world.pointOfView(
            target,
            1500
        );
    }

    return {
        init,
        setEarthquakes,
        setDisasters,
        toggleEarthquakes,
        toggleDisasters,
        toggleConnections,
        focusPoint,
        focusRegion
    };

})();