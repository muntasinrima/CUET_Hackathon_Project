async function initMapPage() {

    // if (window.pageCache.map) return;
    // window.pageCache.map = true;

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
