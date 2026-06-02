window.Eyedom = window.Eyedom || {};

window.Eyedom.config = {
  globe: {
    imageUrl: 'https://unpkg.com/three-globe/example/img/earth-night.jpg',
    bumpImageUrl: 'https://unpkg.com/three-globe/example/img/earth-topology.png',
    backgroundImageUrl: 'https://unpkg.com/three-globe/example/img/night-sky.png',
    atmosphereColor: '#00ffff',
    atmosphereAltitude: 0.18,
    autoRotateSpeed: 0.35
  },

  sources: {
    usgsEarthquakes:
      'https://earthquake.usgs.gov/earthquakes/feed/v1.0/summary/2.5_day.geojson',
    gdacsEvents:
      'https://www.gdacs.org/gdacsapi/api/events/geteventlist/SEARCH',
    gdeltDoc: 'https://api.gdeltproject.org/api/v2/doc/doc',
    openMeteoGeocoding: 'https://geocoding-api.open-meteo.com/v1/search',
    openMeteoForecast: 'https://api.open-meteo.com/v1/forecast'
  },

  defaults: {
    initialCity: 'Roma',
    maxEarthquakePoints: 60,
    maxDisasterPoints: 80,
    visibleEarthquakeItems: 6,
    visibleDisasterItems: 5,
    visibleNewsItems: 6,
    newsCacheMinutes: 15,
    initialNewsFilter: 'global'
  },

  newsFilters: {
    global: {
      label: 'Globali',
      query:
        '(war OR conflict OR attack OR earthquake OR flood OR cyclone OR wildfire OR protest OR sanctions OR "cyber attack" OR crisis)'
    },
    conflicts: {
      label: 'Guerre',
      query:
        '(war OR conflict OR military OR missile OR attack OR ceasefire OR invasion OR "armed group")'
    },
    disasters: {
      label: 'Disastri',
      query:
        '(earthquake OR flood OR cyclone OR hurricane OR wildfire OR volcano OR landslide OR tsunami OR drought)'
    },
    cyber: {
      label: 'Cyber',
      query:
        '("cyber attack" OR ransomware OR malware OR breach OR hacking OR "data leak" OR "critical infrastructure")'
    },
    protests: {
      label: 'Proteste',
      query:
        '(protest OR riots OR demonstration OR strike OR unrest OR clashes OR "civil unrest")'
    },
    energy: {
      label: 'Energia',
      query:
        '(oil OR gas OR pipeline OR refinery OR powergrid OR blackout OR sanctions OR "energy crisis")'
    }
  },

  focus: {
    europe: {
      lat: 48,
      lng: 10,
      altitude: 1.8
    },
    usa: {
      lat: 38,
      lng: -97,
      altitude: 1.8
    }
  }
};
