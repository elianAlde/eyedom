window.Eyedom = window.Eyedom || {};

window.Eyedom.utils = {

    escapeHtml(value) {
        return String(value).replace(
            /[&<>"']/g,
            (character) => ({
                '&': '&amp;',
                '<': '&lt;',
                '>': '&gt;',
                '"': '&quot;',
                "'": '&#039;'
            }[character])
        );
    },

    formatDateTime(date) {
        return new Intl.DateTimeFormat('en-GB', {
			hour: '2-digit',
			minute: '2-digit',
			day: '2-digit',
			month: '2-digit'
		})
    },

    formatDateParam(date) {
        return date.toISOString().slice(0, 10);
    },

    toSafeUrl(value) {
        try {
            const url = new URL(value);

            if (
                !['http:', 'https:']
                    .includes(url.protocol)
            ) {
                return '';
            }

            return url.href;

        } catch (error) {
            return '';
        }
    },

    readCache(key, maxAgeMinutes) {

        try {
            const cached = JSON.parse(
                localStorage.getItem(key)
            );

            if (!cached || !cached.timestamp) {
                return null;
            }

            const maxAge =
                maxAgeMinutes * 60 * 1000;

            const isFresh =
                Date.now() - cached.timestamp <
                maxAge;

            return isFresh
                ? cached.value
                : null;

        } catch (error) {
            return null;
        }
    },

    readStaleCache(key) {
        try {
            const cached = JSON.parse(
                localStorage.getItem(key)
            );

            return cached
                ? cached.value
                : null;

        } catch (error) {
            return null;
        }
    },

    writeCache(key, value) {
        try {
            localStorage.setItem(
                key,
                JSON.stringify({
                    timestamp: Date.now(),
                    value
                })
            );

        } catch (error) {
            // Browser storage can be unavailable
            // in private mode or strict settings.
        }
    },

    getMagnitudeColor(magnitude) {
        if (magnitude >= 5) {
            return '#ff2f2f';
        }

        if (magnitude >= 4) {
            return '#ff8a2a';
        }

        if (magnitude >= 3) {
            return '#ffd166';
        }

        return '#58f7ff';
    },

    getAlertColor(alertLevel) {
        const level = String(
            alertLevel || ''
        ).toLowerCase();

        if (level.includes('red')) {
            return '#ff2f2f';
        }

        if (level.includes('orange')) {
            return '#ff9f1c';
        }

        if (level.includes('green')) {
            return '#50ff8c';
        }

        return '#58f7ff';
    },

    getDisasterTypeLabel(type) {
        return {
            EQ: 'Earthquake',
            TC: 'Cyclone',
            FL: 'Flood',
            VO: 'Volcano',
            DR: 'Drought',
            WF: 'Wildfire'
        }[type] || 'Alert';
    },

    getWeatherIcon(code) {
        if ([0, 1].includes(code)) {
            return '☀';
        }

        if ([2, 3].includes(code)) {
            return '☁';
        }

        if ([45, 48].includes(code)) {
            return '≋';
        }

        if (code >= 51 && code <= 67) {
            return '☂';
        }

        if (code >= 71 && code <= 77) {
            return '✦';
        }

        if (code >= 80 && code <= 82) {
            return '☔';
        }

        if (code >= 95) {
            return '⚡';
        }

        return '•';
    }
};