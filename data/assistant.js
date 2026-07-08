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
