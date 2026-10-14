# @dxos/stories-agent

Storybook stories that prototype agents on Discord end to end: installing the DXOS Discord app (Kai) in a server,
connecting Discord channels to an agent in a durable test space, and talking to the agent from Discord, all against a
locally running EDGE stack. Design: [plugin-agent `docs/DISCORD.md`](../../plugins/plugin-agent/docs/DISCORD.md).

## Setup

You need a dxos checkout (this repo, `<dxos>` below), an edge checkout (`<edge>` below), Chrome, and access to the
`eng` 1Password vault with the 1Password app's CLI integration on (Settings → Developer).

### 1. The Discord app (Kai)

Kai is application `1555777706459660288`
([Developer Portal](https://discord.com/developers/applications/1555777706459660288/information)). Its secrets are in
the 1Password item `op://eng/com.discord.bot.kai`, and edge's `secrets.jsonc` files already refer to them:

| Field | What | Used by |
| --- | --- | --- |
| `credential` | bot token | discord-service (`DISCORD_BOT_TOKEN_DEV`), the EDGE bot |
| `CLIENT_SECRET` | OAuth2 client secret | kms-service (`DISCORD_CLIENT_SECRET`), for **Connect Discord** |
| `APPLICATION_ID` | application id | `.env.tpl` (`DISCORD_KAI_APPLICATION_ID`) |

In the portal, once:

1. **OAuth2 → Redirects → Add Redirect:** `http://localhost:8787/oauth/callback`, then **Save Changes**. Local EDGE
   issues this callback for sign-ins started from `localhost:8787`.
2. **Bot → Message Content Intent:** on. Without it, messages arrive with empty content.
3. **Bot → Requires OAuth2 Code Grant:** off. Leave **Public Bot** as is; it only needs to be on once other teams'
   servers install Kai.
4. Do not **Reset Secret** or **Reset Token** unless the 1Password values are lost: a reset invalidates the stored
   ones.

### 2. Local EDGE

From `<edge>`:

1. Write every worker's `.env`, including Kai's bot token and client secret. 1Password asks you to unlock:

   ```bash
   pnpm dev:env
   ```

2. Start the stack (EDGE listens on `:8787`):

   ```bash
   node scripts/stack.mjs start
   ```

   Re-run `pnpm dev:env` and restart the stack after pulling `secrets.jsonc` changes.

EDGE runs the `@dxos/*` build edge's catalog pins. To run local changes to dxos code that runs on EDGE (plugin-agent
operations and skills, `agent-runtime`, `assistant`), build `<dxos>` and link it into edge with
`node scripts/link-packages.mjs <dxos> --all --install`; never commit the resulting `file:` overrides. Composer-only
changes need no link.

### 3. Storybook

From `<dxos>`:

```bash
moon run storybook-react:serve
```

Open the stories in **Chrome** at `http://localhost:9009/?path=/story/stories-stories-agent-…`. By default the
stories use persistent storage, which runs the client in a SharedWorker; the Claude desktop app's built-in browser
blocks SharedWorker requests, so they cannot boot there unless the `persistent` arg is off.

The **Setup** story's `persistent` arg (Controls) keeps the profile across reloads; changing it reboots the story. Its
toolbar picks the EDGE the client talks to (local, dev, preview or production) and has **Reset**, which wipes the
profile so setup seeds a fresh space. Both take effect on reload; moving a persistent profile to another EDGE resets
it, since it is registered with the old one.

### 4. Try it

In the **Setup** story:

1. **Discord** panel → **Connect Discord** (toolbar) signs you in; the servers you administer appear.
2. On a server without Kai, **Install** (+) opens Discord's consent page; then **Refresh**.
3. Click a server where Kai is installed, then **Connect** (plug) a channel under **Channels**.
4. **Activity** toolbar → **Connect channels** (plug) starts the bot; the **Discord bot** panel reaches ready.
5. Mention `@Kai` in that channel. Kai replies in a thread once its turn ends, and the conversation appears under
   **Activity → Conversations**.

### 5. Check the bot

With the bot token in your shell (`export DISCORD_BOT_TOKEN="$(op read -n op://eng/com.discord.bot.kai/credential)"`),
each of these prints without revealing the token:

```bash
curl -s -H "Authorization: Bot $DISCORD_BOT_TOKEN" https://discord.com/api/v10/applications/@me | jq '{id, name, message_content_intent: (((.flags // 0) / 262144 | floor) % 4 > 0)}'
```

```bash
curl -s -H "Authorization: Bot $DISCORD_BOT_TOKEN" https://discord.com/api/v10/users/@me/guilds | jq '[.[] | {id, name}]'
```

The first must show `message_content_intent: true`; the second lists the servers Kai is installed in.

## Troubleshooting

| Symptom | Cause |
| --- | --- |
| `pnpm dev:env`: "account is not signed in" | The 1Password app is locked or its CLI integration is off. |
| **Could not reach EDGE** with a 403 | Another space owns the bot (the last tab to bind or start it). |
| **Could not reach EDGE**, every request failing | The stack is down: `node scripts/stack.mjs status`, then `start`. |
| The story never finishes loading, "coordinator worker error" | Opened in the Claude desktop app's browser; use Chrome. |
| **Connect Discord** fails at Discord | The redirect URL (§1.1) is missing, or `pnpm dev:env` has not run (§2.1). |
| **Connect channels** is greyed out | No channel is connected yet (§4.3). |
| Agent messages fail with "No process is hosted by this object" | The space outlived the EDGE state its agent ran on; clear the site data for `localhost:9009` and reload. |
| The bot never reaches ready | discord-service has no bot token: re-run `pnpm dev:env` (§2.1). |
| Messages arrive with no text | Message Content Intent is off (§1.2). |
