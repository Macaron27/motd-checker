// services/discordBot.js
const { Client, GatewayIntentBits } = require("discord.js");
const config = require("../config");

let bot;
let channel;

function initBot() {
    if (!config.notifications.enabled) return;

    bot = new Client({
        intents: [
            GatewayIntentBits.Guilds,
            GatewayIntentBits.GuildMessages
        ]
    });

    bot.once("clientReady", () => {
        console.log(`[DiscordBot] Logged in as ${bot.user.tag}`);

        const guild = bot.guilds.cache.get(config.notifications.guildId);
        if (!guild) {
            console.warn("[DiscordBot] Guild not found");
            return;
        }

        channel = guild.channels.cache.get(config.notifications.channelId);
        if (!channel) {
            console.warn("[DiscordBot] Channel not found");
        }
    });

    bot.login(config.notifications.botToken);
}

// Sends a status change notification to Discord
async function notifyStatusChange(serverName, oldStatus, newStatus) {
    if (!channel) return; // channel not yet ready
    if (oldStatus === newStatus) return; // no change

    const msg = `**${serverName}** status changed: ${oldStatus} → ${newStatus}`;
    try {
        await channel.send(msg);
        console.log(`[DiscordBot] Notification sent: ${msg}`);
    } catch (err) {
        console.error("[DiscordBot] Failed to send notification:", err);
    }
}

module.exports = { initBot, notifyStatusChange };
