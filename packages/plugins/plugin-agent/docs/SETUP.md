# Agent setup

How to run an agent and talk to it from Composer, Storybook, Discord and email, against a local EDGE or a deployed
one. Architecture: [DESIGN.md](./DESIGN.md). The Storybook walkthrough is the
[stories-agent README](../../../stories/stories-agent/README.md).

Below, `<dxos>` is a checkout of this repo and `<edge>` a checkout of `dxos/edge`. Both `main` branches carry
everything on this page.

## What runs where

| Piece                                                                            | Repo                                                   | Runs in                                          |
| -------------------------------------------------------------------------------- | ------------------------------------------------------ | ------------------------------------------------ |
| Agent UI, agent objects, `ensureChannelChat` and the other agent operations      | dxos `plugin-agent`, `plugin-discord`, `plugin-thread` | Composer (UI) and edge operation-service (tools) |
| Agent process and brain (`ProcessObject`, `BrainObject`)                         | edge `compute-service`                                 | EDGE                                             |
| Discord bot (`DiscordBot` Durable Object, one per app, holds the Gateway socket) | edge `discord-service`                                 | EDGE                                             |
| Agent mailbox (`AgentMailbox` Durable Object, one per handle)                    | edge `compute-service` (`src/email/`)                  | EDGE                                             |
| Model calls                                                                      | edge `ai-service` (holds `ANTHROPIC_API_KEY`)          | EDGE                                             |
| Discord sign-in, Google OAuth (`/oauth/*`)                                       | edge `kms-service`                                     | EDGE                                             |

EDGE runs the `@dxos/*` build its catalog pins, so Composer-only changes need nothing on the EDGE side. To run local
changes to dxos code that runs on EDGE, see [Link local dxos into edge](#link-local-dxos-into-edge).

## Environments

| EDGE       | Base URL                       | Hub URL                             | Kai app id            | Agent email domain           | Deployed by                   |
| ---------- | ------------------------------ | ----------------------------------- | --------------------- | ---------------------------- | ----------------------------- |
| local      | `http://localhost:8787`        | `http://localhost:8790`             | `1559967387972009984` | `dev.dxos.ai` (no real mail) | you                           |
| dev        | `https://dev.dxos.network`     | `https://dev.dxos.network/hub/`     | `1559736753990926390` | `dev.dxos.ai`                | by hand; the last deploy wins |
| preview    | `https://preview.dxos.network` | `https://preview.dxos.network/hub/` | `1559967457274372126` | `preview.dxos.ai`            | every push to edge `main`     |
| production | `https://dxos.network`         | `https://dxos.network/hub/`         | `1555777706459660288` | `dxos.ai`                    | a push to `edge-production`   |

- Composer's `EDGE_URLS` (`packages/sdk/config/src/edge-services.ts`) and plugin-discord's `KAI_APPLICATION_IDS`
  (`src/constants.ts`) name these four. Composer finds the Kai app by matching the EDGE origin exactly, so
  `127.0.0.1:8787`, a tunnel or any other host gets no Kai, and **Install** is unavailable.
- The names don't line up. The deployed Composer **dev** (`dev.composer.space`) talks to EDGE **preview**, and so
  does a plain local `moon run composer-app:serve`. Only a local Composer you point there talks to EDGE dev.
- An identity and its spaces belong to the EDGE they were created on. Moving to another EDGE means a fresh profile.

## Prerequisites

- 1Password with the desktop app's CLI integration on (Settings → Developer). `pnpm dev:env` reads `eng-dev` and some
  legacy `CI` items, and prompts for approval, so no `op signin` is needed. With several accounts signed in, set
  `OP_ACCOUNT=<account>.1password.com`.
- `wrangler login`: local EDGE opens a remote session for Workers AI. The workers' own Cloudflare token
  (`DX_CLOUDFLARE_TOKEN`) comes from `pnpm dev:env`, not your shell. If wrangler reports an expired login while
  `CLOUDFLARE_API_TOKEN` is set, run `env -u CLOUDFLARE_API_TOKEN npx wrangler login`.
- Chrome for persistent Storybook stories. The Claude desktop browser blocks SharedWorker.
- `mkcert`, only for Composer against EDGE dev.

## Local EDGE

From `<edge>`:

1. Once per machine, set up the local state:

   ```bash
   pnpm dev:setup
   ```

   It installs, builds, wipes the local state dir, runs the D1 migrations and seeds plans and invitation codes.
   Running it again wipes every local identity, space and agent, for every worktree.

2. Write each worker's `.env` from its `secrets.jsonc`:

   ```bash
   pnpm dev:env
   ```

   This writes the Anthropic key for ai-service, Kai Local's bot token for discord-service, and the Composer Discord
   app's client secret for kms-service. Re-run it after pulling `secrets.jsonc` changes. Don't pass `--allow-missing`:
   it skips any key you can't read, including the ones the agent needs. "Not signed in" means the 1Password app is
   locked; "no account found" means set `OP_ACCOUNT`.

3. Start the stack:

   ```bash
   pnpm stack:start
   ```

   `node scripts/stack.mjs start` is the same command. `pnpm stack status`, `pnpm stack:stop` and
   `pnpm stack:doctor` manage it. Logs are in `packages/services/edge/edge-dev-stack.log`.

Agent work touches these workers:

| Worker            | Port | Role                                                        |
| ----------------- | ---- | ----------------------------------------------------------- |
| edge              | 8787 | entry point; forwards `/compute`, `/discord`, `/ai`, `/hub` |
| ai-service        | 8788 | model calls                                                 |
| hub-service       | 8790 | accounts and passkeys                                       |
| mcp-space-service | 8791 | MCP, `askAgent`                                             |
| operation-service | 8792 | the agent's tools                                           |
| compute-service   | 8798 | agent processes, brain, mailboxes                           |
| discord-service   | 8801 | Discord bot                                                 |

operation-service should list the `org.dxos.operation.agent.*` keys, `ensureChannelChat` among them.

### Link local dxos into edge

Only needed to run local changes to dxos code that runs on EDGE: plugin-agent operations and skills,
`agent-runtime`, `assistant`. Link the **whole** workspace; linking a few packages mixes the pinned version with
newer local builds and fails to bundle.

1. Build everything in `<dxos>` (the link packs each package's `dist/`):

   ```bash
   moon exec --on-failure continue --quiet :build
   ```

2. From `<edge>`, link it, then restart the stack:

   ```bash
   node scripts/link-packages.mjs <dxos> --all --install
   ```

Never commit the `file:` overrides; undo them with `git checkout -- package.json pnpm-lock.yaml && pnpm install`.

## Composer

### Against EDGE preview

```bash
moon run composer-app:serve
```

No variables needed: `dx-local.yml` points at preview. Without `DX_HUB_URL` the account and passkey UI is off.

### Against EDGE dev

The [`composer-dev-env` skill](../../../../.agents/skills/composer-dev-env/SKILL.md) has the details. Once per
worktree, from `<dxos>`, make a certificate:

```bash
mkcert -cert-file cert.pem -key-file key.pem local.composer.space localhost 127.0.0.1 ::1
```

Then serve:

```bash
HTTPS=true DX_EDGE_BASE_URL=https://dev.dxos.network/ DX_HUB_URL=https://dev.dxos.network/hub/ DX_AUTH_URL=https://account.dev.composer.space moon run composer-app:serve -- --port 443 --strictPort
```

Open `https://local.composer.space`, sign up and create a passkey. The dev MCP server is
`https://mcp.dev.dxos.network/mcp`.

### Against local EDGE

```bash
DX_EDGE_BASE_URL=http://localhost:8787 DX_HUB_URL=http://localhost:8790 moon run composer-app:serve -- --port 5282
```

`DX_HUB_URL` turns on the account gate. Without it you can't create the hub account a passkey needs. In Composer at
`http://localhost:5282`:

1. Let onboarding finish. It registers the identity's EDGE agent.
2. At the account gate, sign in as `test+<anything>@dxos.org`. Local, dev and preview admit that address with no
   invitation code.
3. **Settings → Plugins**: enable **Agent**, **Threads** and **Discord**. Agent is on by default only with
   `DX_DEV=true`; Discord never is.

Edge's
[`mcp-space-service/TESTING.md`](https://github.com/dxos/edge/blob/main/packages/services/mcp-space-service/TESTING.md)
covers passkeys and the MCP round trip on this setup.

### Create an agent

In any of the setups above:

1. **Space settings → Agents → Add** creates an agent; it opens with your private chat.
2. Its companions connect it to the outside: **Discord** ([below](#discord)) and **Email** ([below](#email)).
3. **Activity** lists its conversations and starts or stops its channels.

## Storybook

```bash
moon run storybook-react:serve
```

Storybook serves on `:9009`. `DX_EDGE_BASE_URL` has no effect here; each story picks its EDGE in code:

| Stories                                                | EDGE                                                                                       |
| ------------------------------------------------------ | ------------------------------------------------------------------------------------------ |
| `stories-agent` (Setup, DiscordAgent, DiscordPipeline) | Toolbar picker: local (default), dev, preview or production. CommentAgent defaults to dev. |
| `stories-inbox`                                        | Fixed: `MailboxSync` uses preview, `MailboxHost` uses dev.                                 |
| `stories-assistant` (Interview, AgentPlayground)       | Fixed per story in `src/testing/decorators.tsx`: preview, local EDGE, or offline.          |
| `plugin-agent`, `plugin-discord`, `plugin-inbox`       | Component stories; no EDGE.                                                                |

The stories that reach EDGE need the same EDGE setup as Composer. The
[stories-agent README](../../../stories/stories-agent/README.md) walks through them.

## Discord

### The Discord apps

| App                                            | Job                                                            | Where EDGE configures it                                              |
| ---------------------------------------------- | -------------------------------------------------------------- | --------------------------------------------------------------------- |
| Composer (`1135690429833171105`)               | **Connect Discord**: the OAuth sign-in that lists your servers | kms-service `DISCORD_CLIENT_ID`, `DISCORD_CLIENT_SECRET`              |
| Kai, one per EDGE (ids [above](#environments)) | The bot you install and mention                                | discord-service `DISCORD_KAI_APPLICATION_ID`, `DISCORD_KAI_BOT_TOKEN` |

EDGE holds Kai's token, so a space never records it. The token is the `credential` field of `com.discord.bot.kai`
in 1Password: the `local` and `dev` sections in `eng-dev`, the deployed ones in `eng-ops`. The bot connects out to
Discord's Gateway, so local EDGE needs no tunnel.

The Composer app's **OAuth2 → Redirects** must include `http://localhost:8787/oauth/callback` for sign-ins through
local EDGE.

Each Kai app's portal settings, set once:

1. **Bot → Message Content Intent:** on. Without it, messages arrive with empty content.
2. **Bot → Requires OAuth2 Code Grant:** off. **Public Bot** is on for Kai only.
3. **Installation:** Guild Install only, install link None. Composer builds the install link itself.
4. Don't **Reset Token** unless the 1Password value is lost; a reset invalidates the stored one.

### Install Kai without signing in

Kai only needs to be in your server; signing in to Discord just lists the servers you administer. Open the link for
your EDGE, pick the server, then press refresh in the agent's **Discord** companion: the server shows as
**Installed**.

| EDGE       | Install link                                                                                            |
| ---------- | ------------------------------------------------------------------------------------------------------- |
| local      | <https://discord.com/oauth2/authorize?client_id=1559967387972009984&scope=bot&permissions=326417583104> |
| dev        | <https://discord.com/oauth2/authorize?client_id=1559736753990926390&scope=bot&permissions=326417583104> |
| preview    | <https://discord.com/oauth2/authorize?client_id=1559967457274372126&scope=bot&permissions=326417583104> |
| production | <https://discord.com/oauth2/authorize?client_id=1555777706459660288&scope=bot&permissions=326417583104> |

The permissions are the ones Composer's install link asks for: View Channels, Send Messages, Send Messages in Threads,
Create Public Threads, Manage Threads and Read Message History. You need Manage Server in the target server. With
**Public Bot** off, only the app's owner, or members of the Developer Team that owns it, can install it; a private
app also needs **Installation → Install Link** set to None.

### Your own bot

A team can bring its own bot instead of Kai; its token is an `AccessToken` in the space.

1. In the [Discord Developer Portal](https://discord.com/developers/applications), click **New Application** and
   note the **Application ID**.
2. **Bot → Reset Token**, and copy the token. Keep it out of chat, commits and logs.
3. **Bot → Message Content Intent:** on.
4. Invite it with
   `https://discord.com/oauth2/authorize?client_id=<APPLICATION_ID>&scope=bot&permissions=326417583104`: View
   Channels, Send Messages, Send Messages in Threads, Create Public Threads, Manage Threads and Read Message History.

Edge's
[`agent-bot/README.md`](https://github.com/dxos/edge/blob/main/packages/services/discord-service/src/agent-bot/README.md)
covers ownership, bindings and the `/discord/bots/*` routes.

### Connect an agent

1. Open the agent's **Discord** companion and sign in to Discord, or skip the sign-in once Kai is in your server
   ([install links](#install-kai-without-signing-in)).
2. Pick your server. Signed in, a server without Kai offers **+** to install it; without signing in, only servers Kai
   is already in appear.
3. Connect a channel with its plug button. This creates a Discord-backed `Channel` in the agent's `AgentChannels`
   and binds it on EDGE.
4. **Start** in the agent's **Activity** companion. The channel's status, polled every 5 s, should read
   **Connected**; otherwise the banner says why, and the watchdog retries every 30 s.

### Bindings and shared bots

Each EDGE runs one bot host per Discord app. It has one owner space and a bindings table keyed by Discord channel id.
Every binding routes to a `Channel` in the owner space, and different channels can go to different agents in that
space.

- A bind or **Start** from another space takes the bot over. EDGE drops the previous space's bindings and thread
  history, and neither side sees an error. Members of one space can share a bot.
- Rebinding a Discord channel to another agent drops the chats of its threads.

| EDGE                     | Who contends for the bot                                                                                                                                             | Working in parallel                                      |
| ------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------- |
| local                    | Nobody: each machine's EDGE keeps its own bindings. Worktrees on one machine share local state, so they share one owner; `DX_DEV_STATE_DIR` gives a session its own. | Each developer binds their own Discord channel.          |
| dev, preview, production | Everyone using that EDGE's Kai; the last space to bind owns it. Preview's Kai also serves `dev.composer.space`.                                                      | Share one space, or bring [your own bot](#your-own-bot). |

Every local stack connects to Discord with Kai Local's token, and Discord sends every message to every connection. A
stack ignores channels it hasn't bound, so developers on different channels don't see each other. Two stacks bound to
the same channel both answer. All of them share the token's rate limits.

The bot uses only the outbound Gateway, so local EDGE needs no public URL. Slash commands would change that: Discord
sends them to the app's Interactions Endpoint URL, so agent slash commands could be tested locally only through a
tunnel, and one app's URL reaches one developer's EDGE. With the URL left empty, Discord sends them over the Gateway
to every connected stack instead.

### Test

1. In the bound channel, post: "Hi, I'm Rich, interview me about my goals." The bot starts a thread on the message
   and replies in it.
2. Answer a few questions and confirm the goals it reads back.
3. In Composer:
   - the agent's **Activity** companion lists the conversation under **Conversations**;
   - your **Person** properties list your goals (proposed, then confirmed) and facts;
   - a profile document exists for you.
4. In the agent's own chat, ask what it knows about you. It reads the same objects.

### Check the bot

With Kai Local's token in your shell
(`export DISCORD_BOT_TOKEN="$(op read -n op://eng-dev/com.discord.bot.kai/local/credential)"`), these print without
revealing the token:

```bash
curl -s -H "Authorization: Bot $DISCORD_BOT_TOKEN" https://discord.com/api/v10/applications/@me | jq '{id, name, message_content_intent: (((.flags // 0) / 262144 | floor) % 4 > 0)}'
```

```bash
curl -s -H "Authorization: Bot $DISCORD_BOT_TOKEN" https://discord.com/api/v10/users/@me/guilds | jq '[.[] | {id, name}]'
```

The first must show `message_content_intent: true`; the second lists the servers Kai is in. On EDGE,
`GET localhost:8787/discord/bots/<appId>` should show `gateway: "ready"`.

## Email

Two features share the word.

### The agent's own address

1. Open the agent's **Email** companion. Set the handle (`kai`), a display name and the allowed senders (empty means
   `braneframe.com` and `dxos.org`), then **Save**.
2. **Connect** claims `<handle>@<domain>` on EDGE. It then shows the address with its thread and message counts;
   "taken" means another space holds the handle.
3. Mail the address from an allowed sender. The reply arrives in the same thread. Each email thread is its own chat
   under the agent; the agent never starts a thread.

| EDGE         | Delivery                                                                                                                                            |
| ------------ | --------------------------------------------------------------------------------------------------------------------------------------------------- |
| production   | Catch-all on `dxos.ai`.                                                                                                                             |
| preview, dev | **Connect** adds a Cloudflare routing rule for that one address. Mail sent before the claim bounces.                                                |
| local        | No real mail. Miniflare's `/cdn-cgi/handler/email` on compute-service delivers messages; edge's `test/email-agent.node.test.ts` is the tested path. |

Cloudflare setup per environment is in edge's
[`compute-service/README.md`](https://github.com/dxos/edge/blob/main/packages/services/compute-service/README.md#e-mail).

### Mailbox sync

plugin-inbox syncs a user's own Gmail or Fastmail into a space, signing in through EDGE's `/oauth/*` with
plugin-google or plugin-jmap. Local EDGE has no `GOOGLE_CLIENT_SECRET`, so use preview or dev for Gmail. See
plugin-inbox's [PLUGIN.mdl](../../plugin-inbox/PLUGIN.mdl).

## Troubleshooting

| Symptom                                                     | Check                                                                                                                                                                                                                                                                                                                |
| ----------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `pnpm dev:env`: "account is not signed in"                  | The 1Password app is locked or its CLI integration is off.                                                                                                                                                                                                                                                           |
| Every EDGE request fails                                    | The stack is down: `pnpm stack status`, then `pnpm stack:start`.                                                                                                                                                                                                                                                     |
| `403 No Composer account is linked to this identity`        | Composer has no `DX_HUB_URL`, or you skipped the account gate.                                                                                                                                                                                                                                                       |
| The bot stopped answering, or your bindings vanished        | Another space bound or started the same bot and took it over ([Bindings and shared bots](#bindings-and-shared-bots)).                                                                                                                                                                                                |
| Start returns 401/403                                       | Your identity isn't a member of the space, or local EDGE doesn't accept a fresh identity. For a curl test without a presentation, set `"EDGE_CONFIG": { "functions": { "noAuth": true } }` in the local-only block of `discord-service/wrangler.jsonc` (never commit it) and `PUT` as edge's agent-bot README shows. |
| "Discord setup failed: Internal server error" on local EDGE | kms-service has no `DX_HUB_SERVICE_KEYPAIR` (edge before dxos/edge#1436): `POST /oauth/initiate` returns 500. Pull an edge with the fix, re-run `pnpm dev:env` and restart, or [skip the sign-in](#install-kai-without-signing-in).                                                                                  |
| **Connect Discord** fails at Discord                        | The Composer app lacks the localhost redirect, or `pnpm dev:env` hasn't run.                                                                                                                                                                                                                                         |
| **Install** is missing                                      | Composer's EDGE origin isn't one of the four in [Environments](#environments).                                                                                                                                                                                                                                       |
| Gateway never `ready`                                       | `GET localhost:8787/discord/bots/<appId>` → `lastError`. Usually a missing token (re-run `pnpm dev:env`) or Message Content Intent off.                                                                                                                                                                              |
| Messages arrive with no text                                | Message Content Intent is off on that Kai app.                                                                                                                                                                                                                                                                       |
| No reply in the thread                                      | Tail discord-service (the bot), compute-service (the agent process) and operation-service (the tools). Confirm `ensureChannelChat` is registered and ai-service has its key.                                                                                                                                         |
| Bundle errors in operation-service                          | A package lacks `dist/`, or the link mixes versions: rebuild `<dxos>` and re-link with `--all`.                                                                                                                                                                                                                      |
| Start/Stop do nothing in Composer                           | Check plugin-discord and plugin-thread are enabled and Composer is on the EDGE you think (`DX_EDGE_BASE_URL`).                                                                                                                                                                                                       |

## Without Discord or a model key

- **Interview, scripted:** the `stories-assistant` **Interview** story runs the interview skill against a scripted
  model and shows the profile filling in
  (`pnpm exec vitest run --project=storybook src/stories/Interview.stories.tsx` in `packages/stories/stories-assistant`).
- **Back-index, faked:** the stories-agent **DiscordPipeline → Scripted** story fakes EDGE and Discord entirely.
- **Bot, fake Discord:** edge's workerd test `test/discord-bot.node.test.ts` runs the bot against a fake Discord (REST
  and gateway).
