const express = require("express");
const util = require("minecraft-server-util");
const mysql = require("mysql2");

const app = express();
const port = 3000;

// MySQL connection setup
const db = mysql.createConnection({
    host: "DBHOST", // Your MySQL host
    user: "DBUSER", // Your MySQL username
    password: "DBPASSWORD", // Your MySQL password
    database: "DBNAME" // Database where BungeeServerManager stores server data
});

db.connect((err) => {
    if (err) {
        console.error("Error connecting to MySQL:", err);
        return;
    }
    console.log("Connected to MySQL!");
});

// Function to check MOTD status
async function checkMOTD() {
    return new Promise((resolve, reject) => {
        db.query("SELECT systemname, ip, port, isactive FROM servermanager_servers", async (err, results) => {
            if (err) {
                console.error("Error fetching servers from DB:", err);
                return reject(err); // Reject promise if DB query fails
            }

            const serverStatus = [];
            let completedRequests = 0;

            for (const srv of results) {
                try {
                    // Increase timeout to 10 seconds
                    const result = await util.status(srv.ip, srv.port, { timeout: 10000 });
                    const motd = result.motd.clean?.trim().toLowerCase() || '';

                    let status = "✅ ONLINE";
                    if (motd.includes("offline")) {
                        status = "🔴 OFFLINE";
                    } else if (motd.includes("stopping")) {
                        status = "🟡 STOPPING";
                    } else if (motd.includes("preparing")) {
                        status = "🟡 PREPARING";
                    } else if (motd.includes("starting")) {
                        status = "🟡 STARTING";
                    }

                    const isActive = status === "✅ ONLINE" ? 1 : 0;
                    db.query("UPDATE servermanager_servers SET isactive = ? WHERE systemname = ?", [isActive, srv.systemname]);

                    serverStatus.push({
                        name: srv.systemname,
                        status: status,
                        motd: motd || "No MOTD set"
                    });
                } catch (e) {
                    console.error(`Error checking server ${srv.systemname}:`, e.message);
                    console.log(motd)
                    serverStatus.push({
                        name: srv.systemname,
                        status: "❌ UNREACHABLE",
                        motd: "N/A"
                    });

                    db.query("UPDATE servermanager_servers SET isactive = 0 WHERE systemname = ?", [srv.systemname]);
                }

                completedRequests++;

                if (completedRequests === results.length) {
                    resolve(serverStatus); // Resolve the promise once all servers are processed
                }
            }
        });
    });
}

// Automatic refresh every 15 seconds
setInterval(() => {
    console.log("Refreshing server statuses...");
    checkMOTD(); // Refresh the server statuses in the backend every 15 seconds
}, 15000); // 15000 ms = 15 seconds

// API route to get MOTD status
app.get("/api/status", async (req, res) => {
    try {
        const status = await checkMOTD();
        //console.log("API response:", status); // DEBUG: Log the status before sending it as a response
        res.json(status);
    } catch (err) {
        console.error("Error fetching status:", err);
        res.status(500).json({ error: "Failed to check MOTD status" });
    }
});

// Serve static HTML (frontend)
app.use(express.static("public"));

app.listen(port, () => {
    console.log(`Server running at http://localhost:${port}`);
});
