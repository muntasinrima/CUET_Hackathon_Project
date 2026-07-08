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
