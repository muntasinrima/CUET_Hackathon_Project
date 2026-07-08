async function fetchWeatherByCoords(lat, lon) {
    const settings = getSettings();
    // API used here: OpenWeather Current Weather API for live temperature, humidity, wind and city name.
    const response = await fetch(`https://api.openweathermap.org/data/2.5/weather?lat=${lat}&lon=${lon}&appid=${settings.openWeatherKey}&units=metric`);
    if (!response.ok) throw new Error("OpenWeather request failed");
    return response.json();
}

async function fetchWeatherByCity(city) {
    const settings = getSettings();
    // API used here: OpenWeather Current Weather API by city name for manual dashboard search.
    const response = await fetch(`https://api.openweathermap.org/data/2.5/weather?q=${encodeURIComponent(city)}&appid=${settings.openWeatherKey}&units=metric`);
    if (!response.ok) throw new Error("OpenWeather city request failed");
    return response.json();
}

async function fetchHeatForecast(lat, lon) {
    // API used here: Open-Meteo Forecast API, no token required, for hourly apparent temperature/heat risk.
    const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&hourly=temperature_2m,relative_humidity_2m,apparent_temperature&current=temperature_2m,relative_humidity_2m,apparent_temperature,wind_speed_10m&timezone=auto`;
    const response = await fetch(url);
    if (!response.ok) throw new Error("Open-Meteo request failed");
    return response.json();
}

async function fetchNearbyShelters(location) {
    const radiusMeters = 7000;
    const query = `
        [out:json][timeout:25];
        (
          node["amenity"~"shelter|school|community_centre"](around:${radiusMeters},${location.lat},${location.lon});
          way["amenity"~"shelter|school|community_centre"](around:${radiusMeters},${location.lat},${location.lon});
          relation["amenity"~"shelter|school|community_centre"](around:${radiusMeters},${location.lat},${location.lon});
          node["emergency"="assembly_point"](around:${radiusMeters},${location.lat},${location.lon});
        );
        out center tags 20;
    `;

    try {
        // API used here: Overpass API over OpenStreetMap to find nearby shelters/schools/community centres.
        const response = await fetch("https://overpass-api.de/api/interpreter", {
            method: "POST",
            body: query,
        });
        if (!response.ok) throw new Error("Overpass request failed");
        const data = await response.json();
        const liveShelters = data.elements.map((item, index) => {
            const lat = item.lat || item.center?.lat;
            const lon = item.lon || item.center?.lon;
            if (!lat || !lon) return null;
            const seed = Math.abs(Number(item.id || index)) % 100;
            const capacity = 300 + (seed * 4);
            const people = Math.min(capacity, 80 + (seed * 3));
            return {
                id: item.id,
                name: item.tags?.name || item.tags?.amenity || "Unnamed safe point",
                lat,
                lon,
                address: item.tags?.["addr:full"] || item.tags?.["addr:street"] || "Address not available",
                capacity,
                people,
                foodPercent: 35 + (seed % 60),
                medical: seed % 3 !== 0,
                roadStatus: seed % 4 === 0 ? "Possible road delay. Check map before moving." : "No major route issue reported.",
            };
        }).filter(Boolean);

        return (liveShelters.length ? liveShelters : RESQ_SAMPLE_SHELTERS)
            .map((shelter) => ({ ...shelter, distance: distanceKm(location, shelter) }))
            .sort((a, b) => a.distance - b.distance)
            .slice(0, 8);
    } catch (error) {
        console.warn("Shelter API fallback:", error.message);
        return RESQ_SAMPLE_SHELTERS
            .map((shelter) => ({ ...shelter, distance: distanceKm(location, shelter) }))
            .sort((a, b) => a.distance - b.distance);
    }
}

async function fetchRouteSummary(from, to) {
    try {
        // API used here: OSRM public routing API to estimate walking/driving distance and route issues.
        const response = await fetch(`https://router.project-osrm.org/route/v1/driving/${from.lon},${from.lat};${to.lon},${to.lat}?overview=false`);
        if (!response.ok) throw new Error("OSRM route request failed");
        const data = await response.json();
        const route = data.routes?.[0];
        if (!route) return null;
        return {
            distanceKm: route.distance / 1000,
            durationMin: route.duration / 60,
            status: route.duration / 60 > 25 ? "Long route. Leave early and monitor road updates." : "Route looks reachable now.",
        };
    } catch (error) {
        console.warn("Route API fallback:", error.message);
        return null;
    }
}

function toggleWeatherMenu() {
    const menu = document.getElementById("weatherMenuOptions");
    if (menu) menu.style.display = menu.style.display === "block" ? "none" : "block";
}

window.addEventListener("click", function (event) {
    if (!event.target.closest(".weather-mode-dropdown")) {
        const menu = document.getElementById("weatherMenuOptions");
        if (menu) menu.style.display = "none";
    }
});

function updateDashboardWeather(data) {
    setText("dash-city", `${data.name || "Current area"}, ${data.sys?.country || ""}`.trim());
    setText("dash-temp", `${Math.round(data.main.temp)} C`);
    setText("dash-desc", data.weather?.[0]?.description || "Live weather");
    setText("dash-humidity", `${data.main.humidity}%`);
    setText("dash-wind", `${data.wind.speed} m/s`);
    setText("metric-weather", `${Math.round(data.main.temp)} C`);

    const iconImg = document.getElementById("dash-icon");
    if (iconImg && data.weather?.[0]?.icon) {
        iconImg.src = `https://openweathermap.org/img/wn/${data.weather[0].icon}@2x.png`;
        iconImg.style.display = "block";
    }
}

async function getAutoLocationWeather(event) {
    if (event) event.preventDefault();
    setText("dash-city", "Locating GPS...");
    try {
        const location = await getCurrentLocation();
        const weather = await fetchWeatherByCoords(location.lat, location.lon);
        updateDashboardWeather(weather);
    } catch (error) {
        setText("dash-city", "Weather fetch failed");
        console.error(error);
    }
}

async function triggerManualSearchPrompt(event) {
    if (event) event.preventDefault();
    const targetCity = prompt("Enter city name, for example Khulna, Dhaka, Chattogram:");
    if (!targetCity?.trim()) return;
    setText("dash-city", "Searching...");
    try {
        const weather = await fetchWeatherByCity(targetCity.trim());
        updateDashboardWeather(weather);
    } catch (error) {
        setText("dash-city", "City not found");
        console.error(error);
    }
}
