// services/motdChecker.js
const mysql = require("mysql2/promise");
const util = require("minecraft-server-util");

// notifyStatusChange comes from the caller so the whole app shares one notifier
module.exports = (config, notifyStatusChange = async () => {}) => {
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

    // Probe one DB row, sync isactive and notify on change
    async function checkServer(srv) {
        const info = await getServerStatus(srv.ip, srv.port);
        const isActive = info.status === "✅ ONLINE" ? 1 : 0;

        // Update DB
        await db.query(
            "UPDATE servermanager_servers SET isactive = ? WHERE systemname = ?",
            [isActive, srv.systemname]
        );

        // Check for status change
        // First sighting after startup is not a change
        const prevStatus = lastStatuses.get(srv.systemname);
        lastStatuses.set(srv.systemname, info.status);
        if (prevStatus && prevStatus !== info.status) {
            await notifyStatusChange(srv.systemname, prevStatus, info.status);
        }

        return {
            name: srv.systemname,
            ...info,
            checkedAt: new Date().toISOString()
        };
    }

    // Results of the last full check, served by the read endpoints
    let latest = null;
    let running = null;

    async function runCheck() {
        const [servers] = await db.query(
            "SELECT systemname, ip, port FROM servermanager_servers"
        );

        const statuses = [];
        for (const srv of servers) {
            statuses.push(await checkServer(srv));
        }

        latest = statuses;
        return statuses;
    }

    // Concurrent callers (interval, API) share the check already in progress
    function checkMOTD() {
        return running ??= runCheck().finally(() => { running = null; });
    }

    // Last results without probing again; runs a check if none has completed yet
    async function getStatuses() {
        return latest ?? checkMOTD();
    }

    // Probe a single server now; null if it isn't in the DB
    // ponytail: doesn't wait for a running full check, which may briefly overwrite this result with its own
    async function checkServerByName(name) {
        const [[srv]] = await db.query(
            "SELECT systemname, ip, port FROM servermanager_servers WHERE systemname = ?",
            [name]
        );
        if (!srv) return null;

        const result = await checkServer(srv);
        if (latest) latest = latest.map(s => s.name === result.name ? result : s);
        return result;
    }

    return { checkMOTD, getStatuses, checkServerByName, getServerStatus };
};
