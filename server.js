const express = require("express");
const config = require("./config");
const { checkMOTD } = require("./services/motdChecker");
const { initBot } = require("./services/discordBot");

console.log("[Server] Starting...");

// Initialize Discord bot
console.log("[Server] Discord bot enabled:", config.notifications.enabled);
initBot();

// Start first check immediately
(async () => {
    console.log("[Checker] Running initial check...");
    try {
        await checkMOTD();
        console.log("[Checker] Initial check completed");
    } catch (err) {
        console.error("[Checker] Initial check failed:", err);
    }
})();

// Background refresh every interval
setInterval(async () => {
    console.log("[Checker] Running scheduled check...");
    try {
        await checkMOTD();
    } catch (err) {
        console.error("[Checker] Scheduled check failed:", err);
    }
}, config.refresh.interval);

// Only start web server if enabled
if (config.server.enabled) {
    console.log("[Server] Web server enabled");
    const app = express();

    app.get("/api/status", async (req, res) => {
        try {
            const status = await checkMOTD();
            res.json(status);
        } catch (err) {
            console.error("[Server] Error fetching status:", err);
            res.status(500).json({ error: "Failed to check MOTD status" });
        }
    });

    app.use(express.static("public"));

    app.listen(config.server.port, () => {
        console.log(`[Server] Web server running at http://localhost:${config.server.port}`);
    });
} else {
    console.log("[Server] Web server disabled");
}
