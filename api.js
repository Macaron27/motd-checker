// api.js
const express = require("express");

module.exports = (checkMOTD) => {
    const router = express.Router();

    // Health check
    router.get("/health", (req, res) => {
        res.json({ status: "ok", timestamp: new Date().toISOString() });
    });

    // Get all servers with status
    router.get("/servers", async (req, res) => {
        try {
            const status = await checkMOTD();
            res.json(status);
        } catch (err) {
            console.error("[API] Error fetching servers:", err);
            res.status(500).json({ error: "Failed to fetch servers" });
        }
    });

    // Get specific server status
    router.get("/servers/:name", async (req, res) => {
        try {
            const status = await checkMOTD();
            const server = status.find(s => s.name === req.params.name);
            if (!server) {
                return res.status(404).json({ error: "Server not found" });
            }
            res.json(server);
        } catch (err) {
            console.error("[API] Error fetching server:", err);
            res.status(500).json({ error: "Failed to fetch server" });
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
            const status = await checkMOTD();
            res.json(status);
        } catch (err) {
            console.error("[API] Error fetching status:", err);
            res.status(500).json({ error: "Failed to check MOTD status" });
        }
    });

    return router;
};
