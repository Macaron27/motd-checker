const { test } = require("node:test");
const assert = require("node:assert/strict");

// Stub minecraft-server-util before motdChecker loads it (its exports are non-configurable getters)
let reply;
const utilPath = require.resolve("minecraft-server-util");
require.cache[utilPath] = {
    id: utilPath,
    filename: utilPath,
    loaded: true,
    exports: {
        status: async () => {
            if (reply instanceof Error) throw reply;
            return reply;
        }
    }
};

// In-memory stand-in for the servermanager_servers table
let rows = [];
const queries = [];
const mysqlPath = require.resolve("mysql2/promise");
require.cache[mysqlPath] = {
    id: mysqlPath,
    filename: mysqlPath,
    loaded: true,
    exports: {
        createPool: () => ({
            query: async (sql, params) => {
                queries.push([sql, params]);
                if (!sql.startsWith("SELECT")) return [{}];
                return [sql.includes("WHERE") ? rows.filter(r => r.systemname === params[0]) : rows];
            }
        })
    }
};

const config = {
    database: {},
    refresh: { minecraftTimeout: 1000 },
    notifications: { enabled: false }
};
const createChecker = require("../services/motdChecker");
const { getServerStatus } = createChecker(config);

const cases = [
    ["A Minecraft Server", "✅ ONLINE"],
    ["Server OFFLINE", "🔴 OFFLINE"],
    ["stopping...", "🟡 STOPPING"],
    ["Preparing world", "🟡 PREPARING"],
    ["Starting up", "🟡 STARTING"]
];

for (const [motd, expected] of cases) {
    test(`MOTD "${motd}" -> ${expected}`, async () => {
        reply = { motd: { clean: motd }, roundTripLatency: 12, players: { online: 3, max: 20 } };
        const info = await getServerStatus("mc.example", 25565);
        assert.equal(info.status, expected);
        assert.equal(info.ping, 12);
        assert.deepEqual(info.players, { online: 3, max: 20 });
    });
}

test("empty MOTD is online with placeholder text", async () => {
    reply = { motd: { clean: "" } };
    const info = await getServerStatus("mc.example", 25565);
    assert.equal(info.status, "✅ ONLINE");
    assert.equal(info.motd, "No MOTD set");
    assert.deepEqual(info.players, { online: 0, max: 0 });
});

test("unreachable server", async () => {
    reply = new Error("ECONNREFUSED");
    const info = await getServerStatus("mc.example", 25565);
    assert.equal(info.status, "❌ UNREACHABLE");
    assert.equal(info.ping, null);
});

test("notifies on status changes, not on first sighting", async () => {
    const calls = [];
    const { checkMOTD } = createChecker(config, async (...args) => calls.push(args));
    rows = [{ systemname: "lobby", ip: "mc.example", port: 25565 }];

    reply = { motd: { clean: "hello" } };
    await checkMOTD();
    await checkMOTD();
    assert.deepEqual(calls, []);

    reply = { motd: { clean: "server offline" } };
    await checkMOTD();
    assert.deepEqual(calls, [["lobby", "✅ ONLINE", "🔴 OFFLINE"]]);
    assert.deepEqual(queries.at(-1), ["UPDATE servermanager_servers SET isactive = ? WHERE systemname = ?", [0, "lobby"]]);
});

test("concurrent checks share one run and results are cached", async () => {
    const { checkMOTD, getStatuses } = createChecker(config);
    rows = [{ systemname: "lobby", ip: "mc.example", port: 25565 }, { systemname: "hub", ip: "mc.example", port: 25566 }];
    reply = { motd: { clean: "hello" } };
    queries.length = 0;

    const [a, b] = await Promise.all([checkMOTD(), checkMOTD()]);
    assert.equal(a, b);
    assert.equal(queries.filter(([sql]) => sql.startsWith("SELECT")).length, 1);

    assert.equal(await getStatuses(), a);
    assert.equal(queries.length, 3); // 1 SELECT + 2 UPDATEs, nothing new from getStatuses
    assert.ok(!Number.isNaN(Date.parse(a[0].checkedAt)));
});

test("getStatuses runs a check when there are no results yet", async () => {
    const { getStatuses } = createChecker(config);
    rows = [{ systemname: "lobby", ip: "mc.example", port: 25565 }];
    reply = { motd: { clean: "hello" } };
    assert.deepEqual((await getStatuses()).map(s => s.name), ["lobby"]);
});

test("checkServerByName probes one server and refreshes the cache", async () => {
    const calls = [];
    const { checkMOTD, getStatuses, checkServerByName } = createChecker(config, async (...args) => calls.push(args));
    rows = [{ systemname: "lobby", ip: "mc.example", port: 25565 }, { systemname: "hub", ip: "mc.example", port: 25566 }];
    reply = { motd: { clean: "hello" } };
    await checkMOTD();

    assert.equal(await checkServerByName("nope"), null);

    reply = { motd: { clean: "stopping" } };
    queries.length = 0;
    const hub = await checkServerByName("hub");
    assert.equal(hub.status, "🟡 STOPPING");
    assert.deepEqual(queries.map(([, params]) => params), [["hub"], [0, "hub"]]);
    assert.deepEqual(calls, [["hub", "✅ ONLINE", "🟡 STOPPING"]]);
    assert.deepEqual((await getStatuses()).map(s => s.status), ["✅ ONLINE", "🟡 STOPPING"]);
});
