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
