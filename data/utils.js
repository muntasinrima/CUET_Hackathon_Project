function getSettings() {
    const saved = JSON.parse(localStorage.getItem("resqSettings") || "{}");
    return { ...RESQ_DEFAULTS, ...saved };
}

function saveSettings(settings) {
    localStorage.setItem("resqSettings", JSON.stringify({ ...getSettings(), ...settings }));
}

function setText(id, value) {
    const element = document.getElementById(id);
    if (element) element.textContent = value;
}

function formatDistance(km) {
    if (!Number.isFinite(km)) return "--";
    return km < 1 ? `${Math.round(km * 1000)} m` : `${km.toFixed(1)} km`;
}

function distanceKm(a, b) {
    const earthRadius = 6371;
    const dLat = (b.lat - a.lat) * Math.PI / 180;
    const dLon = (b.lon - a.lon) * Math.PI / 180;
    const lat1 = a.lat * Math.PI / 180;
    const lat2 = b.lat * Math.PI / 180;
    const value = Math.sin(dLat / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLon / 2) ** 2;
    return earthRadius * 2 * Math.atan2(Math.sqrt(value), Math.sqrt(1 - value));
}

function getCurrentLocation() {
    return new Promise((resolve) => {
        if (!navigator.geolocation) {
            resolve({ lat: 22.8156, lon: 89.5634, label: "Khulna fallback" });
            return;
        }

        navigator.geolocation.getCurrentPosition(
            (position) => resolve({
                lat: position.coords.latitude,
                lon: position.coords.longitude,
                label: "Your current location",
            }),
            () => resolve({ lat: 22.8156, lon: 89.5634, label: "Khulna fallback" }),
            { enableHighAccuracy: true, timeout: 9000, maximumAge: 60000 }
        );
    });
}
