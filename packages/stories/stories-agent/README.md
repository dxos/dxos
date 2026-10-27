# @dxos/stories-agent

Storybook stories that prototype agents on Discord end to end: installing the DXOS Discord app (Kai) in a server,
connecting Discord channels to an agent in a durable test space, and talking to the agent from Discord, all against a
locally running EDGE stack. Design: [plugin-agent `docs/DISCORD.md`](../../plugins/plugin-agent/docs/DISCORD.md).

## Setup

You need a dxos checkout (this repo, `<dxos>` below), an edge checkout (`<edge>` below), Chrome, and access to the
`eng` and `CI` 1Password vaults with the 1Password app's CLI integration on (Settings → Developer).

### 1. The Discord apps

Two kinds of Discord app take part, and each EDGE environment has its own Kai:

| App | Job | Where EDGE configures it |
| --- | --- | --- |
| Composer (`1135690429833171105`) | **Connect Discord**: the OAuth sign-in that lists your servers | kms-service `DISCORD_CLIENT_ID` and `DISCORD_CLIENT_SECRET` |
| Kai | The bot you install and mention | discord-service `DISCORD_KAI_APPLICATION_ID` and `DISCORD_KAI_BOT_TOKEN` |

| EDGE | Kai app | Application id |
| --- | --- | --- |
| local | Kai Local | `1559967387972009984` |
| dev | Kai Dev | `1559736753990926390` |
| preview | Kai Preview | `1559967457274372126` |
| staging | Kai Staging | `1559968567775072356` |
| production | Kai | `1555777706459660288` |

Composer picks the Kai of the EDGE it talks to (`KAI_APPLICATION_IDS` in plugin-discord's `src/constants.ts`), so a
space records no bot; staging has no entry there, since `EDGE_URLS` names no staging EDGE. Each Kai's bot token is the `DISCORD_KAI_BOT_TOKEN` field of `op://CI/hub.dxos.network/discord-service-<env>` (the
unprefixed `discord-service` section for local).

In each Kai app's portal, once:

1. **Bot → Message Content Intent:** on. Without it, follow-ups in a Kai thread arrive with empty content.
2. **Bot → Requires OAuth2 Code Grant:** off. **Public Bot** is on for Kai only.
3. **Installation:** Guild Install only, install link None. Composer builds the install link itself.
4. Do not **Reset Token** unless the 1Password value is lost: a reset invalidates the stored one.

The Composer app's **OAuth2 → Redirects** must include `http://localhost:8787/oauth/callback`, which local EDGE
issues for sign-ins started from `localhost:8787`.

### 2. Local EDGE

From `<edge>`:

1. Write every worker's `.env`, including Kai Local's bot token and the Composer app's client secret. 1Password
   asks you to unlock:

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

In the **DiscordPipeline → Setup** story (`?path=/story/stories-stories-agent-discordpipeline--setup`), a Discord
back-index runs as a remote timer trigger on EDGE: plugin-discord's `CrawlDiscordChannels` reads the channels' history
with the Discord token stored in the space, keeps its progress in a `CrawlState` object and appends the facts it
extracts to a fact feed; the agent's brain indexes the fact feed once it is registered. It needs an EDGE that serves
the brain's `/compute/brain/:spaceId/:agentId/fact-feeds` routes and runs operation-service with this branch's
plugin-discord: the edge branch `dm/elegant-euler-at56gd`, either checked out in `<edge>` and started with
`node scripts/stack.mjs start` (section 2), or deployed to the EDGE the toolbar picks.

1. **Discord** panel: sign in, install Kai and **Connect** a channel, as steps 1–3 above. The sign-in stores the
   Discord connection, and its token, in the space.
2. **Discord back-index** panel: pick the **Connection**, check the channel under **Channels**, set **Max days**
   (e.g. 30), leave **Descend threads** on, and pick an **Interval**.
3. **Start**: the crawl state, the fact feed and the trigger are created, and the channel appears under **Targets**.
   Each run of the trigger, or **Run now**, moves the targets' cursors and the **Messages read** and **Facts in the
   feed** counters; the **Timeline** records each change of the crawl state.
4. Switch **Agent brain** on: the brain indexes the fact feed, and the **brain** companion lists the facts.
5. **Pause** and **Resume** switch the trigger off and on; a row's reset button re-reads that channel or thread from
   the start, and **Reset all** re-reads every target, without a model call for a message read before.

The **DiscordPipeline → Scripted** story runs the same panel with EDGE faked (`startFakeBackIndexRunner` steps the
crawl state while the trigger is on, `installFakeBrain` answers the fact feed routes), with no Discord or EDGE at all.

### 5. Check the bot

With Kai Local's bot token in your shell
(`export DISCORD_BOT_TOKEN="$(op read -n op://CI/hub.dxos.network/discord-service/DISCORD_KAI_BOT_TOKEN)"`), each of
these prints without revealing the token:

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
| **Connect Discord** fails at Discord | The Composer app lacks the localhost redirect (§1), or `pnpm dev:env` has not run (§2.1). |
| **Install** opens a different Kai, or the bot never starts | The profile predates per-environment Kai apps and records the old app id; **Reset** it. |
| **Connect channels** is greyed out | No channel is connected yet (§4.3). |
| Agent messages fail with "No process is hosted by this object" | The space outlived the EDGE state its agent ran on; clear the site data for `localhost:9009` and reload. |
| The bot never reaches ready | discord-service has no bot token: re-run `pnpm dev:env` (§2.1). |
| Messages arrive with no text | Message Content Intent is off on that Kai app (§1). |
