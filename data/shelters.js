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
