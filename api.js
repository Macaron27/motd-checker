// api.js
const express = require("express");

// Read endpoints serve the last check's results; POST endpoints probe now
module.exports = ({ checkMOTD, getStatuses, checkServerByName }) => {
    const router = express.Router();

    // Health check
    router.get("/health", (req, res) => {
        res.json({ status: "ok", timestamp: new Date().toISOString() });
    });

    // Get all servers with status
    router.get("/servers", async (req, res) => {
        try {
            res.json(await getStatuses());
        } catch (err) {
            console.error("[API] Error fetching servers:", err);
            res.status(500).json({ error: "Failed to fetch servers" });
        }
    });

    // Get specific server status
    router.get("/servers/:name", async (req, res) => {
        try {
            const server = (await getStatuses()).find(s => s.name === req.params.name);
            if (!server) {
                return res.status(404).json({ error: "Server not found" });
            }
            res.json(server);
        } catch (err) {
            console.error("[API] Error fetching server:", err);
            res.status(500).json({ error: "Failed to fetch server" });
        }
    });

    // Check a single server now
    router.post("/servers/:name/check", async (req, res) => {
        try {
            const server = await checkServerByName(req.params.name);
            if (!server) {
                return res.status(404).json({ error: "Server not found" });
            }
            res.json(server);
            console.log(`[API] Manual check of ${server.name} triggered via API`);
        } catch (err) {
            console.error("[API] Error during server check:", err);
            res.status(500).json({ error: "Server check failed" });
        }
    });

    // Server counts per status, e.g. { total: 3, counts: { online: 2, unreachable: 1 }, checkedAt }
    router.get("/summary", async (req, res) => {
        try {
            const statuses = await getStatuses();
            const counts = {};
            for (const s of statuses) {
                const key = s.status.split(" ").pop().toLowerCase(); // "✅ ONLINE" -> "online"
                counts[key] = (counts[key] ?? 0) + 1;
            }
            // ISO timestamps sort lexicographically
            const checkedAt = statuses.map(s => s.checkedAt).sort().at(-1) ?? null;
            res.json({ total: statuses.length, counts, checkedAt });
        } catch (err) {
            console.error("[API] Error building summary:", err);
            res.status(500).json({ error: "Failed to build summary" });
        }
    });

    // Manual check trigger
    router.post("/check", async (req, res) => {
        try {
            const status = await checkMOTD();
            res.json({ message: "Manual check completed", status, timestamp: new Date().toISOString() });
            console.log("[API] Manual check triggered via API");
        } catch (err) {
            console.error("[API] Error during manual check:", err);
            res.status(500).json({ error: "Manual check failed" });
        }
    });

    // Legacy endpoint
    router.get("/status", async (req, res) => {
        try {
            res.json(await getStatuses());
        } catch (err) {
            console.error("[API] Error fetching status:", err);
            res.status(500).json({ error: "Failed to check MOTD status" });
        }
    });

    return router;
};
