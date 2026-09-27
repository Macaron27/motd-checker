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

const { getServerStatus } = require("../services/motdChecker")({
    database: {},
    refresh: { minecraftTimeout: 1000 },
    notifications: { enabled: false }
});

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
