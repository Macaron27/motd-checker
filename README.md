🧩 **motd-checker**

**motd-checker** is a lightweight Node.js tool that monitors the **Message of the Day (MOTD)** of your Minecraft servers registered through **BungeeCord**.
It automatically checks for updates and can trigger notifications or database updates when the MOTD changes.
It use the **BungeeServerManager** plugin to dynamically update the server availibility to **BungeeCord**.

---

⚙️ **Features**
- 🔍 Detects changes in the MOTD of Minecraft servers
- 🔄 Integrates with BungeeServerManager to propagate updates
- 🗄️ Uses an SQL database to store server availibility
- ⚡ Configurable polling interval and target servers
- 📣 Optional notification hooks throught a UI.
- 💾 Keeps a snapshot of the previous MOTD for accurate comparisons

---

🧠 **Why It’s Useful**
- Detect MOTD to enable / disable your servers on your BungeeCord
- Detect outage on your infrastructure and prevent access to disabled arena (thus prevent user confusion)

---

🚀 **Getting Started**

1️⃣ **Clone the repository**:
```bash
git clone https://github.com/Macaron27/motd-checker.git
cd motd-checker
```

2️⃣ **Install dependencies**:
```bash
npm install
```

3️⃣ **Configure your environment**:
Set up **BungeeServerManager** on your BungeeCord network
Configure your **SQL database** connection in the config file
Define target servers and the check interval

4️⃣ **Run the checker**:
```bash
node server.js
```

5️⃣ **Verify functionality**:
Watch the console or your notification channel for MOTD updates!

---

🧩 **Future Improvements**
- Support for multiple notification channels (Slack, email, etc.)
- Docker container for easier deployment
- REST API endpoint to fetch the current Status of all registered servers

---

📜 License
This project is open source and available under the MIT License.
