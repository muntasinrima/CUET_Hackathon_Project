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
