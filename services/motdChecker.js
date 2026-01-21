const mysql = require("mysql2/promise");
const util = require("minecraft-server-util");
const config = require("../config");
const { notifyStatusChange } = require("./discordBot");

// Database pool
const db = mysql.createPool({
    host: config.database.host,
    user: config.database.user,
    password: config.database.password,
    database: config.database.name,
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0
});

// Keep track of last known status in memory
const lastStatuses = new Map();

async function getServerStatus(ip, port) {
    try {
        const result = await util.status(ip, port, {
            timeout: config.refresh.minecraftTimeout
        });

        const motd = result.motd?.clean?.trim().toLowerCase() || "";
        let status = "✅ ONLINE";
        if (motd.includes("offline")) status = "🔴 OFFLINE";
        else if (motd.includes("stopping")) status = "🟡 STOPPING";
        else if (motd.includes("preparing")) status = "🟡 PREPARING";
        else if (motd.includes("starting")) status = "🟡 STARTING";

        return {
            status,
            motd: motd || "No MOTD set",
            ping: result.roundTripLatency ?? null,
            players: {
                online: result.players?.online ?? 0,
                max: result.players?.max ?? 0
            }
        };
    } catch {
        return {
            status: "❌ UNREACHABLE",
            motd: "N/A",
            ping: null,
            players: { online: 0, max: 0 }
        };
    }
}

async function checkMOTD() {
    const [servers] = await db.query(
        "SELECT systemname, ip, port FROM servermanager_servers"
    );

    const statuses = [];

    for (const srv of servers) {
        const info = await getServerStatus(srv.ip, srv.port);
        const isActive = info.status === "✅ ONLINE" ? 1 : 0;

        // Update DB
        await db.query(
            "UPDATE servermanager_servers SET isactive = ? WHERE systemname = ?",
            [isActive, srv.systemname]
        );

        // Check for status change
        const prevStatus = lastStatuses.get(srv.systemname) || "N/A";
        if (prevStatus !== info.status) {
            lastStatuses.set(srv.systemname, info.status);
            await notifyStatusChange(srv.systemname, prevStatus, info.status);
        }

        statuses.push({
            name: srv.systemname,
            ...info
        });
    }

    return statuses;
}

module.exports = { checkMOTD, getServerStatus };
