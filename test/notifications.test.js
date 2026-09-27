const { test, before, after } = require("node:test");
const assert = require("node:assert/strict");
const http = require("node:http");
const createNotifications = require("../services/notifications");

// Local receiver: /slack and /hook record payloads, /broken answers 500
const received = [];
const receiver = http.createServer((req, res) => {
    let body = "";
    req.on("data", chunk => body += chunk);
    req.on("end", () => {
        if (req.url === "/broken") return res.writeHead(500).end("boom");
        received.push({ path: req.url, type: req.headers["content-type"], body: JSON.parse(body) });
        res.end("ok");
    });
});

let base;
before(() => new Promise(resolve => receiver.listen(0, "127.0.0.1", () => {
    base = `http://127.0.0.1:${receiver.address().port}`;
    resolve();
})));
after(() => receiver.close());

const notifier = (slackWebhookUrl, webhookUrl) =>
    createNotifications({ notifications: { enabled: false, slackWebhookUrl, webhookUrl } });

test("Slack and webhook both receive a status change", async (t) => {
    t.mock.method(console, "log", () => {});
    received.length = 0;
    await notifier(`${base}/slack`, `${base}/hook`).notifyStatusChange("lobby", "✅ ONLINE", "🔴 OFFLINE");

    const slack = received.find(r => r.path === "/slack");
    assert.equal(slack.type, "application/json");
    assert.deepEqual(slack.body, { text: "*lobby* status changed: ✅ ONLINE → 🔴 OFFLINE" });

    const hook = received.find(r => r.path === "/hook").body;
    assert.deepEqual({ ...hook, timestamp: undefined }, { server: "lobby", previous: "✅ ONLINE", current: "🔴 OFFLINE", timestamp: undefined });
    assert.ok(!Number.isNaN(Date.parse(hook.timestamp)));
});

test("a failing channel is logged and doesn't block the others", async (t) => {
    t.mock.method(console, "log", () => {});
    const errors = t.mock.method(console, "error", () => {});
    received.length = 0;
    await notifier(`${base}/broken`, `${base}/hook`).notifyStatusChange("lobby", "a", "b");

    assert.deepEqual(received.map(r => r.path), ["/hook"]);
    assert.equal(errors.mock.callCount(), 1);
    assert.deepEqual(errors.mock.calls[0].arguments, ["[Notify] Slack failed:", "HTTP 500 boom"]);
});

test("unset or invalid URLs disable the channel without logging the value", async (t) => {
    const logs = t.mock.method(console, "log", () => {});
    const warnings = t.mock.method(console, "warn", () => {});
    await notifier("", "hooks.example/secret-token").notifyStatusChange("lobby", "a", "b");

    assert.deepEqual(logs.mock.calls[0].arguments, ["[Notify] Channels:", "none"]);
    assert.equal(warnings.mock.callCount(), 1);
    assert.ok(!String(warnings.mock.calls[0].arguments).includes("secret-token"));
});
