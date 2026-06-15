# Discord Worker

Cloudflare Worker that handles Discord interaction webhooks for the DXOS Composer Discord plugin.

## Slash Commands

- `/connect <space-key>` — binds the current Discord guild/channel to a DXOS space.
- `/track` — posts the current thread as a Markdown document to the connected space.

## Setup

### 1. Create a Discord Application

- Open the [Discord Developer Portal](https://discord.com/developers/applications).
- Create a new application.
  - Under **Bot**, create a bot and copy the token.
  - Under **General Information**, copy the Application ID and Public Key.
  - Under **OAuth > URL Generator**, select scopes `bot` + `applications.commands` and permissions `Send Messages` + `Read Message History`. Copy the URL to add the bot to a guild.

### 2. Register Slash Commands

```bash
DISCORD_APPLICATION_ID=<app-id> BOT_TOKEN=<token> npx tsx src/register-commands.ts
```

### 3. Configure Secrets

Create a `.dev.vars` file (gitignored) with:

```
DISCORD_PUBLIC_KEY=<public-key-from-portal>
BOT_TOKEN=<bot-token>
BOT_DID=<bot-did-from-composer>
```

## Local Development

### Run the Worker

```bash
npx wrangler dev
# Starts on http://localhost:8787
```

### Expose via Tunnel

Discord requires a public HTTPS endpoint for interaction webhooks. Use a tunnel to expose your local worker:

**Option A — Cloudflare Tunnel (no account needed):**

```bash
cloudflared tunnel --url http://localhost:8787
# Outputs: https://<hash>.trycloudflare.com
```

**Option B — ngrok:**

```bash
ngrok http 8787
# Outputs: https://<hash>.ngrok-free.app
```

### Point Discord at the Tunnel

In the [Developer Portal](https://discord.com/developers/applications) → your app → **General Information**:
- Set **Interactions Endpoint URL** to the tunnel URL (e.g., `https://abc123.trycloudflare.com`).
- Discord immediately sends a PING to verify the signature — the worker handles this automatically.

> **Note:** The tunnel URL changes on restart. Update the portal each time.

### Verify

Invoke `/connect <space-key>` or `/track` in a Discord channel where the bot is present. The worker logs to the `wrangler dev` console.

EDGE endpoint calls will fail locally unless a local EDGE instance is running.

## Deployment

```bash
# Set production secrets
npx wrangler secret put DISCORD_PUBLIC_KEY
npx wrangler secret put BOT_TOKEN
npx wrangler secret put BOT_DID

# Deploy
npx wrangler deploy
```

Then update the Discord **Interactions Endpoint URL** to the deployed worker URL.
