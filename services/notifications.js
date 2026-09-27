// services/notifications.js
module.exports = (config) => {
    const discord = require("./discordBot")(config);

    const { slackWebhookUrl, webhookUrl } = config.notifications;

    async function post(url, body) {
        const res = await fetch(url, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(body),
            signal: AbortSignal.timeout(5000)
        });
        if (!res.ok) throw new Error(`HTTP ${res.status} ${(await res.text()).slice(0, 200)}`);
    }

    // Webhook URLs are secrets: never log them, and reject bad ones here since
    // fetch's "Failed to parse URL" error would echo the value
    function usable(name, url) {
        if (!url) return false;
        if (URL.canParse(url)) return true;
        console.warn(`[Notify] ${name} URL is not a valid URL, channel disabled`);
        return false;
    }

    // [name, send(serverName, oldStatus, newStatus)]
    const channels = [];
    if (config.notifications.enabled) channels.push(["Discord", discord.notifyStatusChange]);
    if (usable("Slack", slackWebhookUrl)) {
        // Slack mrkdwn: single asterisks for bold
        channels.push(["Slack", (name, oldStatus, newStatus) =>
            post(slackWebhookUrl, { text: `*${name}* status changed: ${oldStatus} → ${newStatus}` })]);
    }
    if (usable("Webhook", webhookUrl)) {
        channels.push(["Webhook", (name, oldStatus, newStatus) =>
            post(webhookUrl, { server: name, previous: oldStatus, current: newStatus, timestamp: new Date().toISOString() })]);
    }

    console.log("[Notify] Channels:", channels.map(([name]) => name).join(", ") || "none");

    // Sends to every channel; one failing channel doesn't stop the others
    async function notifyStatusChange(serverName, oldStatus, newStatus) {
        const results = await Promise.allSettled(channels.map(([, send]) => send(serverName, oldStatus, newStatus)));
        results.forEach((r, i) => {
            if (r.status === "rejected") console.error(`[Notify] ${channels[i][0]} failed:`, r.reason?.message);
        });
    }

    return { init: discord.initBot, notifyStatusChange };
};
