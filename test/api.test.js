const { test, before, after } = require("node:test");
const assert = require("node:assert/strict");
const express = require("express");
const api = require("../api");

const servers = [
    { name: "lobby", status: "✅ ONLINE", checkedAt: "2026-01-01T00:00:05.000Z" },
    { name: "hub", status: "✅ ONLINE", checkedAt: "2026-01-01T00:00:09.000Z" },
    { name: "survival", status: "🔴 OFFLINE", checkedAt: "2026-01-01T00:00:07.000Z" }
];
let failing = false;
const probes = []; // which checker functions actually probed servers

const fail = () => { if (failing) throw new Error("db down"); };
const app = express().use("/api", api({
    getStatuses: async () => { fail(); return servers; },
    checkMOTD: async () => { fail(); probes.push("all"); return servers; },
    checkServerByName: async (name) => {
        fail();
        probes.push(name);
        return servers.find(s => s.name === name) ?? null;
    }
}));

let server, base;
before(() => new Promise(resolve => {
    server = app.listen(0, () => {
        base = `http://127.0.0.1:${server.address().port}/api`;
        resolve();
    });
}));
after(() => server.close());

test("GET /health", async () => {
    const res = await fetch(`${base}/health`);
    assert.equal(res.status, 200);
    assert.equal((await res.json()).status, "ok");
});

test("GET /servers and legacy /status return all servers", async () => {
    for (const path of ["/servers", "/status"]) {
        const res = await fetch(base + path);
        assert.equal(res.status, 200);
        assert.deepEqual(await res.json(), servers);
    }
});

test("GET /servers/:name", async () => {
    const res = await fetch(`${base}/servers/lobby`);
    assert.equal(res.status, 200);
    assert.deepEqual(await res.json(), servers[0]);
    assert.equal((await fetch(`${base}/servers/nope`)).status, 404);
});

test("read endpoints serve cached results without probing", async () => {
    probes.length = 0;
    for (const path of ["/servers", "/servers/lobby", "/summary", "/status"]) await fetch(base + path);
    assert.deepEqual(probes, []);
});

test("POST /check runs a full check", async (t) => {
    t.mock.method(console, "log", () => {});
    probes.length = 0;
    const res = await fetch(`${base}/check`, { method: "POST" });
    assert.equal(res.status, 200);
    assert.deepEqual((await res.json()).status, servers);
    assert.deepEqual(probes, ["all"]);
});

test("POST /servers/:name/check probes only that server", async (t) => {
    t.mock.method(console, "log", () => {});
    probes.length = 0;
    const res = await fetch(`${base}/servers/survival/check`, { method: "POST" });
    assert.equal(res.status, 200);
    assert.deepEqual(await res.json(), servers[2]);
    assert.equal((await fetch(`${base}/servers/nope/check`, { method: "POST" })).status, 404);
    assert.deepEqual(probes, ["survival", "nope"]);
});

test("GET /summary counts servers per status", async () => {
    const res = await fetch(`${base}/summary`);
    assert.equal(res.status, 200);
    assert.deepEqual(await res.json(), {
        total: 3,
        counts: { online: 2, offline: 1 },
        checkedAt: "2026-01-01T00:00:09.000Z"
    });
});

test("checker failure returns 500", async (t) => {
    t.mock.method(console, "error", () => {});
    failing = true;
    try {
        for (const [method, path] of [["GET", "/servers"], ["GET", "/servers/lobby"], ["POST", "/servers/lobby/check"], ["GET", "/summary"], ["POST", "/check"], ["GET", "/status"]]) {
            assert.equal((await fetch(base + path, { method })).status, 500, `${method} ${path}`);
        }
    } finally {
        failing = false;
    }
});
