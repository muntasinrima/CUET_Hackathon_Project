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
