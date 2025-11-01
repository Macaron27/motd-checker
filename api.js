// routes/api.js
const express = require("express");
const router = express.Router();
const db = require("../db");
const { getServerStatus } = require("../motd");

router.get("/status", async (req, res) => {
    try {
        const [servers] = await db.query("SELECT systemname, ip, port FROM servermanager_servers");
        const statusList = await Promise.all(servers.map(async srv => {
            const status = await getServerStatus(srv.ip, srv.port);
            await db.query("UPDATE servermanager_servers SET isactive = ? WHERE systemname = ?", [
                status.status === "✅ ONLINE" ? 1 : 0,
                srv.systemname
            ]);
            return {
                name: srv.systemname,
                ...status
            };
        }));
        res.json(statusList);
    } catch (err) {
        console.error("Error fetching status:", err);
        res.status(500).json({ error: "Failed to check server status." });
    }
});

module.exports = router;
