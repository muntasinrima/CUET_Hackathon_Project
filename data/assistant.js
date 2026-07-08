function addChatMessage(role, text) {
    const chat = document.getElementById("chat-messages");
    if (!chat) return;
    const bubble = document.createElement("div");
    bubble.className = `chat-bubble ${role}`;
    bubble.textContent = text;
    chat.appendChild(bubble);
    chat.scrollTop = chat.scrollHeight;
}

async function offlineAssistantReply(question) {

    const lower = question.toLowerCase();

    try {

        const location = await getCurrentLocation();
        const shelters = await fetchNearbyShelters(location);

        if (lower.includes("shelter")) {

            if (!shelters || shelters.length === 0) {
                return "⚠️ No nearby shelter data available offline.";
            }

            const s = shelters[0];

            return `🏠 Nearest Shelter

${s.name}
📍 ${s.distance.toFixed(1)} km away
👥 ${s.people}/${s.capacity} occupied
🩺 Medical: ${s.medical ? "Yes" : "No"}

Connect to the internet for live updates.`;
        }

        if (lower.includes("heat") || lower.includes("temperature")) {

            return "🔥 Offline Mode\nStay hydrated, avoid outdoor activity from 11 AM–4 PM, and check the Heatwave page for the latest information.";
        }

        if (lower.includes("location") || lower.includes("where am i")) {

            return `📍 Your Location

Latitude: ${location.lat.toFixed(5)}
Longitude: ${location.lon.toFixed(5)}`;
        }

        if (lower.includes("report") || lower.includes("emergency")) {

            return "🚨 You can still submit an emergency report while offline.";
        }

        return "📴 Offline Mode. Limited information is available.";

    } catch (err) {

        return "📴 Offline Mode. Unable to access location.";
    }
}

async function sendAssistantMessage(event) {
    event.preventDefault();
    const input = document.getElementById("chat-input");
    const question = input?.value.trim();
    if (!question) return;
    input.value = "";
    addChatMessage("user", question);
    addChatMessage("bot", "Analyzing your situation...");
    const botMessages = document.querySelectorAll(".chat-bubble.bot");
    const lastBot = botMessages[botMessages.length - 1];

    try {
        const location = await getCurrentLocation();
        const shelters = await fetchNearbyShelters(location);

        const prompt = `
You are ResQ AI, an emergency disaster assistant.

Current Location:
Latitude: ${location.lat}
Longitude: ${location.lon}

Nearby Shelters:
${JSON.stringify(shelters)}

User Question:
${question}

Instructions:
- Keep replies under 100 words.
- Be concise and practical.
- Do not greet unless the user greets first.
- Never use long paragraphs.
- Use short bullet points if helpful.
- Recommend only shelters from the provided shelter list.
- If no shelters are available, say: "No verified shelter found near your location."
- Mention only:
  • Shelter name
  • Distance
  • Occupancy
  • Medical: Yes/No
  • One-line recommendation
- If the question is about heat, give only the risk level and 2-3 safety tips.
- Always finish with one clear recommendation.
- If information is unavailable, say "Information unavailable" instead of guessing.
- Never invent facts.
`;

        const response = await fetch(
            "https://api.groq.com/openai/v1/chat/completions",
            {
                method: "POST",
                headers: {
                    "Authorization": `Bearer ${RESQ_API_KEY}`,
                    "Content-Type": "application/json"
                },
                body: JSON.stringify({
    model: "openai/gpt-oss-120b",

    temperature: 0.3,
    max_tokens: 180,

    messages: [
        {
            role: "system",
            content: "You are ResQ AI, a disaster-response assistant. Give short, factual, action-oriented answers under 100 words. Never guess missing information. Use only the provided location and shelter data."
        },
        {
            role: "user",
            content: prompt
        }
    ]
})
            }
        );

        const data = await response.json();

        if (!response.ok || data.error) {
            // Surface the real Groq error (bad model, revoked key, rate limit, etc.)
            // instead of a generic failure, so it's obvious what to fix next.
            throw new Error(data.error?.message || `Request failed with status ${response.status}`);
        }

        lastBot.textContent = data.choices[0].message.content;
    } catch (error) {
    console.error(error);

    const offlineReply = await offlineAssistantReply(question);

    setTimeout(() => {
        lastBot.textContent = offlineReply;
    }, 300);
}
}

function initAssistantPage() {

    //  if (window.pageCache.assistant) return;
    // window.pageCache.assistant = true;

    const form = document.getElementById("chat-form");
    if (!form) return;
    form.addEventListener("submit", sendAssistantMessage);
}