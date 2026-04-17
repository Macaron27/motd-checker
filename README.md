# motd-checker

motd-checker is a lightweight Node.js application that monitors the Message of the Day (MOTD) of Minecraft servers registered through BungeeCord. It automatically checks for updates and can trigger notifications or database updates when the MOTD changes. It integrates with the BungeeServerManager plugin to dynamically update server availability in BungeeCord.

## Features

- Detects changes in the MOTD of Minecraft servers
- Integrates with BungeeServerManager to propagate updates
- Uses an SQL database to store server availability
- Configurable polling interval and target servers
- Optional Discord notifications (enabled with `--discord` flag)
- Web API for status checking
- Keeps a snapshot of the previous MOTD for accurate comparisons

## Why It's Useful

- Detect MOTD changes to enable/disable servers on BungeeCord
- Detect outages in infrastructure and prevent access to disabled servers, reducing user confusion

## Requirements

- Node.js
- MySQL database
- BungeeCord with BungeeServerManager plugin

## Installation

1. Clone the repository:
   ```bash
   git clone https://github.com/Macaron27/motd-checker.git
   cd motd-checker
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Set up your environment variables in a `.env` file:
   ```env
   # Database
   DB_HOST=your_db_host
   DB_USER=your_db_user
   DB_PASSWORD=your_db_password
   DB_NAME=your_db_name

   # Optional: Web server
   ENABLE_WEB=1
   PORT=3000

   # Optional: Refresh interval (ms)
   REFRESH_INTERVAL=15000

   # Optional: Minecraft timeout (ms)
   MINECRAFT_TIMEOUT=10000

   # Optional: Discord notifications
   DISCORD_BOT_TOKEN=your_bot_token
   DISCORD_GUILD_ID=your_guild_id
   DISCORD_CHANNEL_ID=your_channel_id
   ```

## Usage

Run the checker:
```bash
node server.js
```

To enable Discord notifications:
```bash
node server.js --discord
```

The application will start monitoring the servers and update the database accordingly. If Discord is enabled, it will send notifications on status changes.

## API

If the web server is enabled, you can access the following endpoints:

- `GET /api/health` - Health check endpoint
- `GET /api/servers` - Returns the current status of all monitored servers
- `GET /api/servers/:name` - Returns the status of a specific server by name
- `POST /api/check` - Manually triggers a status check and returns the results
- `GET /api/status` - Legacy endpoint, same as `/api/servers`

The web interface is available at `http://localhost:3000` (or configured port).

## Future Improvements

- Support for additional notification channels (Slack, email, etc.)
- Docker container for easier deployment
- Enhanced REST API endpoints

## License

This project is open source and available under the GNU GPLv3 License.
