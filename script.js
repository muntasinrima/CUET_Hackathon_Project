// ResQ AI shared frontend integration layer.
// API comments are kept beside each integration so you can replace demo/free APIs with your backend later.

const RESQ_DEFAULTS = {
    openWeatherKey: "5232b569eb1f09cf5eeb40f932c2d91b",
    assistantEndpoint: "/api/assistant",
    reportEndpoint: "/api/reports",
    heatWarningCelsius: 38,
    shelterCapacityWarning: 85,
    profileName: "Field Operator",
    profilePhone: "",
};

const RESQ_SAMPLE_SHELTERS = [
    {
        id: "demo-1",
        name: "Khulna Government Cyclone Shelter",
        lat: 22.8156,
        lon: 89.5634,
        address: "Khulna Sadar",
        capacity: 600,
        people: 328,
        foodPercent: 72,
        medical: true,
        roadStatus: "Clear route, light traffic near the main road.",
    },
    {
        id: "demo-2",
        name: "Boyra Community Shelter",
        lat: 22.8293,
        lon: 89.5512,
        address: "Boyra, Khulna",
        capacity: 450,
        people: 386,
        foodPercent: 44,
        medical: false,
        roadStatus: "Waterlogging reported on one side road.",
    },
    {
        id: "demo-3",
        name: "Sonadanga School Shelter",
        lat: 22.8044,
        lon: 89.5409,
        address: "Sonadanga, Khulna",
        capacity: 520,
        people: 210,
        foodPercent: 83,
        medical: true,
        roadStatus: "Route currently open.",
    },
];

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

async function initDashboardPage() {
    await getAutoLocationWeather(null);
    const location = await getCurrentLocation();
    const shelters = await fetchNearbyShelters(location);
    setText("metric-shelters", shelters.length.toString().padStart(2, "0"));
    const nearest = shelters[0];
    if (nearest) {
        setText("dash-rec-title", nearest.name);
        setText("dash-rec-capacity", `${Math.max(nearest.capacity - nearest.people, 0)} seats available`);
        setText("dash-rec-food", `${nearest.foodPercent}% food stock`);
        setText("dash-rec-medical", nearest.medical ? "Medical support available" : "No medical desk reported");
        setText("dash-rec-distance", formatDistance(nearest.distance));
    }

    if (window.L && document.getElementById("mini-map")) {
        const map = L.map("mini-map").setView([location.lat, location.lon], 12);
        // API used here: Carto/OpenStreetMap raster tiles for the dashboard mini map.
        L.tileLayer("https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png", { maxZoom: 19 }).addTo(map);
        L.marker([location.lat, location.lon]).addTo(map).bindPopup("You are here");
        shelters.slice(0, 4).forEach((shelter) => L.marker([shelter.lat, shelter.lon]).addTo(map).bindPopup(shelter.name));
    }
}

async function initMapPage() {
    const mapElement = document.getElementById("full-map");
    if (!window.L || !mapElement) return;
    const status = document.getElementById("map-status");
    if (status) status.textContent = "Detecting your location...";
    const location = await getCurrentLocation();
    const map = L.map("full-map").setView([location.lat, location.lon], 13);
    // API used here: Carto/OpenStreetMap map tiles. Geolocation comes from the browser GPS/location permission.
    L.tileLayer("https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png", { maxZoom: 19 }).addTo(map);
    L.circleMarker([location.lat, location.lon], {
        radius: 9,
        color: "#2563eb",
        fillColor: "#2563eb",
        fillOpacity: 0.9,
    }).addTo(map).bindPopup(location.label).openPopup();

    const shelters = await fetchNearbyShelters(location);
    shelters.forEach((shelter) => {
        L.marker([shelter.lat, shelter.lon]).addTo(map).bindPopup(`
            <strong>${shelter.name}</strong><br>
            Distance: ${formatDistance(shelter.distance)}<br>
            People: ${shelter.people}/${shelter.capacity}<br>
            Food: ${shelter.foodPercent}%<br>
            Road: ${shelter.roadStatus}
        `);
    });
    if (status) status.textContent = `Showing ${shelters.length} nearby safe points around your location.`;
}

function shelterCardHtml(shelter) {
    const occupancy = Math.round((shelter.people / shelter.capacity) * 100);
    const warningClass = occupancy >= getSettings().shelterCapacityWarning ? "danger" : "ok";
    return `
        <article class="data-card shelter-card">
            <div class="data-card-header">
                <div>
                    <h4>${shelter.name}</h4>
                    <p>${shelter.address}</p>
                </div>
                <span class="status-pill ${warningClass}">${formatDistance(shelter.distance)}</span>
            </div>
            <div class="stat-row"><span>People inside</span><strong>${shelter.people}/${shelter.capacity}</strong></div>
            <div class="progress-track"><span style="width:${occupancy}%"></span></div>
            <div class="stat-row"><span>Food stock</span><strong>${shelter.foodPercent}%</strong></div>
            <div class="progress-track food"><span style="width:${shelter.foodPercent}%"></span></div>
            <div class="detail-grid-small">
                <span><i class="fa-solid fa-kit-medical"></i> ${shelter.medical ? "Medical available" : "Medical unavailable"}</span>
                <span><i class="fa-solid fa-road"></i> ${shelter.roadStatus}</span>
            </div>
            <button class="action-btn-primary" onclick="showShelterRoute('${shelter.id}')">Check route</button>
        </article>
    `;
}

let latestShelters = [];
let latestLocation = null;

async function initSheltersPage() {
    const list = document.getElementById("shelter-list");
    if (!list) return;
    list.innerHTML = "<p class='muted-line'>Finding shelters near your current location...</p>";
    latestLocation = await getCurrentLocation();
    latestShelters = await fetchNearbyShelters(latestLocation);
    list.innerHTML = latestShelters.map(shelterCardHtml).join("");
    setText("shelter-summary", `${latestShelters.length} shelters/safe points found near ${latestLocation.label}.`);
}

async function showShelterRoute(id) {
    const shelter = latestShelters.find((item) => String(item.id) === String(id));
    const output = document.getElementById("route-output");
    if (!shelter || !latestLocation || !output) return;
    output.textContent = "Checking route...";
    const route = await fetchRouteSummary(latestLocation, shelter);
    output.textContent = route
        ? `${shelter.name}: ${route.distanceKm.toFixed(1)} km, about ${Math.round(route.durationMin)} min. ${route.status}`
        : `${shelter.name}: ${formatDistance(shelter.distance)} away. Live route service unavailable, use the map before moving.`;
}

async function initHeatwavePage() {
    const output = document.getElementById("heat-grid");
    if (!output) return;
    output.innerHTML = "<p class='muted-line'>Loading live heat index data...</p>";
    try {
        const location = await getCurrentLocation();
        const data = await fetchHeatForecast(location.lat, location.lon);
        const current = data.current;
        const warning = Number(current.apparent_temperature) >= Number(getSettings().heatWarningCelsius);
        setText("heat-location", location.label);
        output.innerHTML = `
            <div class="metric-card"><span class="card-title">Temperature</span><span class="card-value txt-orange">${Math.round(current.temperature_2m)} C</span></div>
            <div class="metric-card"><span class="card-title">Feels Like</span><span class="card-value ${warning ? "txt-red" : "txt-blue"}">${Math.round(current.apparent_temperature)} C</span></div>
            <div class="metric-card"><span class="card-title">Humidity</span><span class="card-value txt-blue">${current.relative_humidity_2m}%</span></div>
            <div class="metric-card"><span class="card-title">Wind</span><span class="card-value txt-blue">${current.wind_speed_10m} km/h</span></div>
        `;
        setText("heat-advice", warning
            ? "High heat stress risk. Open cooling shelters, reduce outdoor work, and send hydration alerts."
            : "Heat stress is below your warning threshold, but keep monitoring vulnerable groups.");
    } catch (error) {
        output.innerHTML = "<p class='muted-line'>Heat data could not be loaded right now.</p>";
        console.error(error);
    }
}

function addChatMessage(role, text) {
    const chat = document.getElementById("chat-messages");
    if (!chat) return;
    const bubble = document.createElement("div");
    bubble.className = `chat-bubble ${role}`;
    bubble.textContent = text;
    chat.appendChild(bubble);
    chat.scrollTop = chat.scrollHeight;
}

function offlineAssistantReply(question) {
    const lower = question.toLowerCase();
    if (lower.includes("shelter")) return "Open Shelters to find nearby safe points. Choose the lowest occupancy shelter with food above 50% and a clear route.";
    if (lower.includes("heat") || lower.includes("temperature")) return "For heatwave risk, check Heatwave. If feels-like temperature crosses your threshold, avoid outdoor work and hydrate every 20 minutes.";
    if (lower.includes("report") || lower.includes("emergency")) return "Use Report to submit location, incident type, severity and notes. If life is at risk, call local emergency services first.";
    return "I can help with shelter choice, heat risk, emergency reporting and safe movement. Add a backend AI endpoint in Settings for real model answers.";
}

async function sendAssistantMessage(event) {
    event.preventDefault();
    const input = document.getElementById("chat-input");
    const question = input?.value.trim();
    if (!question) return;
    input.value = "";
    addChatMessage("user", question);
    addChatMessage("bot", "Thinking...");
    const botMessages = document.querySelectorAll(".chat-bubble.bot");
    const lastBot = botMessages[botMessages.length - 1];

    try {
        const settings = getSettings();
        // API used here: your future backend chatbot endpoint. It should call OpenAI/Gemini/etc. server-side, not from browser JS.
        const response = await fetch(settings.assistantEndpoint, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ message: question }),
        });
        if (!response.ok) throw new Error("Assistant backend unavailable");
        const data = await response.json();
        lastBot.textContent = data.reply || data.message || offlineAssistantReply(question);
    } catch (error) {
        lastBot.textContent = offlineAssistantReply(question);
    }
}

function initAssistantPage() {
    const form = document.getElementById("chat-form");
    if (!form) return;
    form.addEventListener("submit", sendAssistantMessage);
}

async function submitReport(event) {
    event.preventDefault();
    const form = event.currentTarget;
    const formData = new FormData(form);
    const location = await getCurrentLocation();
    const payload = {
        type: formData.get("type"),
        severity: formData.get("severity"),
        details: formData.get("details"),
        contact: formData.get("contact"),
        lat: location.lat,
        lon: location.lon,
        createdAt: new Date().toISOString(),
    };

    try {
        const settings = getSettings();
        // API used here: your future backend emergency-report endpoint for storing reports in a database.
        const response = await fetch(settings.reportEndpoint, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload),
        });
        if (!response.ok) throw new Error("Report backend unavailable");
        setText("report-status", "Report sent to emergency backend successfully.");
    } catch (error) {
        const saved = JSON.parse(localStorage.getItem("resqOfflineReports") || "[]");
        saved.unshift(payload);
        localStorage.setItem("resqOfflineReports", JSON.stringify(saved.slice(0, 20)));
        setText("report-status", "Backend not available, so this report was saved locally for demo/testing.");
    }
    form.reset();
}

function initReportPage() {
    const form = document.getElementById("report-form");
    if (form) form.addEventListener("submit", submitReport);
}

function initSettingsPage() {
    const form = document.getElementById("settings-form");
    if (!form) return;
    const settings = getSettings();
    Object.keys(settings).forEach((key) => {
        const input = form.elements[key];
        if (input) input.value = settings[key];
    });
    form.addEventListener("submit", (event) => {
        event.preventDefault();
        const updated = Object.fromEntries(new FormData(form).entries());
        saveSettings(updated);
        setText("settings-status", "Settings saved in this browser.");
    });
}

document.addEventListener("DOMContentLoaded", () => {
    const page = document.body.dataset.page;
    if (page === "dashboard") initDashboardPage();
    if (page === "map") initMapPage();
    if (page === "shelters") initSheltersPage();
    if (page === "heatwave") initHeatwavePage();
    if (page === "assistant") initAssistantPage();
    if (page === "report") initReportPage();
    if (page === "settings") initSettingsPage();
});

/* ===========================
   Shelter Module
=========================== */

document.addEventListener("DOMContentLoaded", () => {

    const shelterContainer = document.getElementById("shelter-list");

    if (!shelterContainer) return;

    shelterContainer.innerHTML = "";

    window.shelters.forEach(shelter => {

        const available = shelter.capacity - shelter.occupied;

        shelterContainer.innerHTML += `

        <div class="shelter-card">

            <h3>${shelter.name}</h3>

            <p><strong>📍 District:</strong> ${shelter.district}</p>

            <p><strong>👥 Capacity:</strong> ${shelter.capacity}</p>

            <p><strong>🟢 Available:</strong> ${available}</p>

            <p><strong>🍚 Food:</strong> ${shelter.food ? "✅ Yes" : "❌ No"}</p>

            <p><strong>🏥 Medical:</strong> ${shelter.medical ? "✅ Yes" : "❌ No"}</p>

            <p><strong>💧 Water:</strong> ${shelter.water ? "✅ Yes" : "❌ No"}</p>

            <p><strong>⚡ Electricity:</strong> ${shelter.electricity ? "✅ Yes" : "❌ No"}</p>

            <p><strong>Status:</strong> ${shelter.status}</p>

        </div>

        `;

    });

});