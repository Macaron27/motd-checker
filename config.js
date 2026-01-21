// config.js
require("dotenv").config();

const { cleanEnv, str, num } = require("envalid");

const env = cleanEnv(process.env, {
    // Server
    ENABLE_WEB: num({ default: 1 }),
    PORT: num({ default: 3000 }),

    // Refresh / checker
    REFRESH_INTERVAL: num({ default: 15000 }),
    MINECRAFT_TIMEOUT: num({ default: 10000 }),

    // Database (required)
    DB_HOST: str(),
    DB_USER: str(),
    DB_PASSWORD: str(),
    DB_NAME: str(),

    // Discord (optional)
    DISCORD_BOT_ENABLED: num({ default: 0 }),
    DISCORD_BOT_TOKEN: str({ default: "" }),
    DISCORD_GUILD_ID: str({ default: "" }),
    DISCORD_CHANNEL_ID: str({ default: "" })
});

const config = {
    server: {
        enabled: env.ENABLE_WEB === 1,
        port: env.PORT
    },

    refresh: {
        interval: env.REFRESH_INTERVAL,
        minecraftTimeout: env.MINECRAFT_TIMEOUT
    },

    database: {
        host: env.DB_HOST,
        user: env.DB_USER,
        password: env.DB_PASSWORD,
        name: env.DB_NAME
    },

    notifications: {
        enabled: !!env.DISCORD_BOT_ENABLED,
        botToken: env.DISCORD_BOT_TOKEN,
        guildId: env.DISCORD_GUILD_ID,
        channelId: env.DISCORD_CHANNEL_ID
    },
};

module.exports = config;
