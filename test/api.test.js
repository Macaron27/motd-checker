const { test, before, after } = require("node:test");
const assert = require("node:assert/strict");
const express = require("express");
const api = require("../api");

const servers = [
    { name: "lobby", status: "✅ ONLINE" },
    { name: "survival", status: "🔴 OFFLINE" }
];
let failing = false;

const app = express().use("/api", api(async () => {
    if (failing) throw new Error("db down");
    return servers;
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

test("POST /check", async () => {
    const res = await fetch(`${base}/check`, { method: "POST" });
    assert.equal(res.status, 200);
    assert.deepEqual((await res.json()).status, servers);
});

test("checker failure returns 500", async (t) => {
    t.mock.method(console, "error", () => {});
    failing = true;
    try {
        for (const [method, path] of [["GET", "/servers"], ["GET", "/servers/lobby"], ["POST", "/check"], ["GET", "/status"]]) {
            assert.equal((await fetch(base + path, { method })).status, 500, `${method} ${path}`);
        }
    } finally {
        failing = false;
    }
});
