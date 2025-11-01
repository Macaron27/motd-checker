// motd.js
const util = require("minecraft-server-util");

async function getServerStatus(ip, port) {
    try {
        const result = await util.status(ip, port, { timeout: 5000 });
        const motd = result.motd.clean?.trim().toLowerCase() || '';
        const online = !motd.includes("offline") && result.players.online !== 0;

        return {
            status: motd.includes("starting") ? "🟡 STARTING" : online ? "✅ ONLINE" : "🔴 OFFLINE",
            motd,
            ping: result.roundTripLatency,
            players: {
                online: result.players.online,
                max: result.players.max
            }
        };
    } catch {
        return {
            status: "❌ UNREACHABLE",
            motd: "N/A",
            ping: null,
            players: {
                online: 0,
                max: 0
            }
        };
    }
}

module.exports = { getServerStatus };
