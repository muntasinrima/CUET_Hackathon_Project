function initSettingsPage() {

    // if (window.pageCache.shelters) return;
    // window.pageCache.shelters = true;

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
