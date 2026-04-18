require("dotenv").config();

// Check for --discord flag to enable Discord notifications
if (process.argv.includes('--discord')) {
    process.env.DISCORD_BOT_ENABLED = '1';
} else {
    process.env.DISCORD_BOT_ENABLED = '0';
}

const config = {
    server: {
        enabled: process.env.ENABLE_WEB ? parseInt(process.env.ENABLE_WEB) === 1 : true,
        port: process.env.PORT ? parseInt(process.env.PORT) : 3000
    },
    refresh: {
        interval: process.env.REFRESH_INTERVAL ? parseInt(process.env.REFRESH_INTERVAL) : 15000,
        minecraftTimeout: process.env.MINECRAFT_TIMEOUT ? parseInt(process.env.MINECRAFT_TIMEOUT) : 10000
    },
    database: {
        host: process.env.DB_HOST,
        user: process.env.DB_USER,
        password: process.env.DB_PASSWORD,
        name: process.env.DB_NAME
    },
    notifications: {
        enabled: process.env.DISCORD_BOT_ENABLED ? parseInt(process.env.DISCORD_BOT_ENABLED) === 1 : false,
        botToken: process.env.DISCORD_BOT_TOKEN || "",
        guildId: process.env.DISCORD_GUILD_ID || "",
        channelId: process.env.DISCORD_CHANNEL_ID || ""
    }
};

const express = require("express");
const { checkMOTD } = require("./services/motdChecker")(config);
const { initBot } = require("./services/discordBot")(config);
const apiRoutes = require("./api")(checkMOTD);

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

    app.use(express.json());
    app.use("/api", apiRoutes);

    app.use(express.static("public"));

    app.listen(config.server.port, () => {
        console.log(`[Server] Web server running at http://localhost:${config.server.port}`);
    });
} else {
    console.log("[Server] Web server disabled");
}
