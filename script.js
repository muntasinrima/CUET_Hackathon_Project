// ==========================================================================
// INTEGRATED LIVE GEOLOCATION & WEATHER LOGIC MATRIX FOR DASHBOARD
// ==========================================================================
const DASH_API_KEY = "5232b569eb1f09cf5eeb40f932c2d91b"; // Preserved from source script

// Toggle the weather options dropdown panel
function toggleWeatherMenu() {
    const menu = document.getElementById("weatherMenuOptions");
    if (menu) {
        menu.style.display = menu.style.display === "block" ? "none" : "block";
    }
}

// Close weather options menu if clicked anywhere outside the dropdown window
window.addEventListener("click", function (e) {
    if (!e.target.closest('.weather-mode-dropdown')) {
        const menu = document.getElementById("weatherMenuOptions");
        if (menu) menu.style.display = "none";
    }
});

// Master asynchronous function to query weather metrics from API
async function fetchDashboardWeather(queryParam) {
    try {
        const response = await fetch(
            `https://api.openweathermap.org/data/2.5/weather?${queryParam}&appid=${DASH_API_KEY}&units=metric`
        );
        if (!response.ok) throw new Error("Location matrix invalid");

        const data = await response.json();

        // Update values in UI Dashboard Panel DOM
        document.getElementById("dash-city").innerText = `${data.name}, ${data.sys.country}`;
        document.getElementById("dash-temp").innerText = `${Math.round(data.main.temp)}°C`;
        document.getElementById("dash-desc").innerText = data.weather[0].description;
        document.getElementById("dash-humidity").innerText = `${data.main.humidity}%`;
        document.getElementById("dash-wind").innerText = `${data.wind.speed} m/s`;

        // Render Condition Weather Icon
        const iconImg = document.getElementById("dash-icon");
        if (iconImg) {
            iconImg.src = `https://openweathermap.org/img/wn/${data.weather[0].icon}@2x.png`;
            iconImg.style.display = "block";
        }

    } catch (error) {
        console.error("Weather Pipeline Error:", error.message);
        document.getElementById("dash-city").innerText = "Fetch Failed";
    }
}

// OPTION A: Automatic GPS Core Trigger
function getAutoLocationWeather(event) {
    if (event) event.preventDefault();
    document.getElementById("dash-city").innerText = "Locating GPS...";

    if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
            (position) => {
                const lat = position.coords.latitude;
                const lon = position.coords.longitude;
                fetchDashboardWeather(`lat=${lat}&lon=${lon}`);
            },
            (error) => {
                // Fallback default system location if client blocks GPS access
                fetchDashboardWeather("q=Dhaka");
            }
        );
    } else {
        fetchDashboardWeather("q=Dhaka");
    }
}

// OPTION B: Manual Prompt Trigger Search Custom Inputs
function triggerManualSearchPrompt(event) {
    if (event) event.preventDefault();
    const targetCity = prompt("Enter City Name (e.g. Khulna, Rajshahi, London):");
    if (targetCity && targetCity.trim() !== "") {
        document.getElementById("dash-city").innerText = "Searching Matrix...";
        fetchDashboardWeather(`q=${encodeURIComponent(targetCity.trim())}`);
    }
}

// Auto execution hook on module page mount initialization
document.addEventListener("DOMContentLoaded", () => {
    getAutoLocationWeather(null);
});