# Interlocutor — end-to-end setup (Discord ↔ EDGE ↔ Composer)

How to run an autonomous agent locally and talk to it from a Discord server and from Composer.
Architecture: [DESIGN.md](./DESIGN.md). The EDGE half lives in the `dxos/edge` repo
(`packages/services/compute-service/src/discord/`, whose README covers the bot routes in detail).

You need three things running:

1. **A Discord bot** in a test server.
2. **A local EDGE stack** (edge repo) with plugin-agent linked into it.
3. **A local Composer** (this repo) pointed at that EDGE.

Below, `<dxos>` is a dxos checkout on a branch that includes plugin-agent, and `<edge>` is an
edge checkout on a branch that includes the compute-service Discord bot.

## 1. Create the Discord bot

1. In the [Discord Developer Portal](https://discord.com/developers/applications), click
   **New Application**. Note the **Application ID** (General Information).
2. **Bot → Reset Token**, and copy the token. Keep it out of chat, commits and logs.
3. **Bot → Message Content Intent**: on. Without it, messages arrive with empty content.
4. **OAuth2 → URL Generator**: scope `bot`; permissions View Channels, Send Messages, Send Messages
   in Threads, Create Public Threads, Read Message History. Open the generated URL and add the bot to
   your test server.
5. Or skip the generator and open
   `https://discord.com/oauth2/authorize?client_id=<APPLICATION_ID>&scope=bot&permissions=309237713920`
   (the same five permissions). Confirm under **Server Settings → Integrations → Bots and Apps**; the
   bot shows offline in the member list until EDGE connects it.
6. In Discord, **Settings → Advanced → Developer Mode** on; right-click the test channel →
   **Copy Channel ID**.

## 2. Build dxos and link it into edge

plugin-agent (and the `AgentInput` change in `@dxos/agent-runtime`) are not published, so EDGE
uses them through a local link. Link the **whole** workspace: linking a few packages mixes the
dxos version edge's catalog pins with newer local builds and fails to bundle.

1. Build everything in `<dxos>` (the link packs each package's `dist/`):

   ```bash
   moon exec --on-failure continue --quiet :build
   ```

2. From `<edge>`, link it:

   ```bash
   node scripts/link-packages.mjs <dxos> --all --install
   ```

3. In `<edge>/packages/services/operation-service/src/registry.ts`, add
   `AgentPlugin.make()` to `PLUGINS` (import `@dxos/plugin-agent/AgentPlugin`).

Never commit the `file:` overrides or the registry edit; undo them with
`git checkout -- package.json pnpm-lock.yaml packages/services/operation-service/src/registry.ts && pnpm install`.

The `<dxos>` branch must contain the dxos commit edge's catalog pins (merge dxos `main` if it does
not). Rebuild and re-link whenever you change dxos code that runs on EDGE (plugin-agent
operations, `agent-runtime`, `assistant`); Composer-only changes need no re-link.

## 3. Start EDGE

Secrets reach the workers the same way as every other edge secret: each worker's `secrets.jsonc`
holds `op://` references, and `pnpm dev:env` resolves them with `op inject` and writes the `.env`
files. It needs the 1Password desktop app with CLI integration on (Settings → Developer); it prompts
for approval, so no `op signin` is needed.

1. Store the bot token in 1Password following the key standard: vault `eng-dev`, item named in
   reverse-DNS form, field `credential` (e.g. `op://eng-dev/com.discord.bot.kai/credential`). Item
   names must not contain `/`, which `op://` references reject. Point `DISCORD_BOT_TOKEN_DEV` in
   compute-service's `secrets.jsonc` (top-level block) at that reference. In a dev environment it
   overrides the token stored in the space, so you can test without managing tokens in Composer.

2. From the root of `<edge>` (the script is defined in the root `package.json`), write the `.env`
   files:

   ```bash
   pnpm dev:env
   ```

   If it reports "no account found", pin the account: `OP_ACCOUNT=<account>.1password.com pnpm dev:env`.

3. Start (or restart) the stack, also from the root of `<edge>`. EDGE listens on `:8787`:

   ```bash
   node scripts/stack.mjs start
   ```

If wrangler reports an expired login and your shell has `CLOUDFLARE_API_TOKEN` set, log in with
`env -u CLOUDFLARE_API_TOKEN npx wrangler login`.

Check that the agent's operations are registered: operation-service should list the
`org.dxos.operation.agent.*` keys (`ensureThreadChat` among them).

## 4. Start Composer against local EDGE

From `<dxos>`:

```bash
DX_EDGE_BASE_URL=http://localhost:8787 moon run composer-app:serve -- --port 5282
```

Then, in Composer at `http://localhost:5282`:

1. **Settings → Plugins**: enable **Agent** and **Discord**.
2. Connect Discord in the space's integrations by pasting the bot token. This creates the
   `AccessToken` object the binding refers to (EDGE uses `DISCORD_BOT_TOKEN_DEV` when set).
3. **Assistant → Agents → +** to create an agent.
4. Open the agent → **Activity** companion → **Discord**: pick the bot token, enter the
   **Application ID** and the **channel ID**, and **Save**.
5. **Start bot** in the companion's toolbar: the status (polled every 5 s) should read **Connected**.
   Otherwise `lastError` says why (the watchdog retries every 30 s).

## 5. Test

1. In the bound channel, post: "Hi, I'm Rich — interview me about my goals." The bot starts a thread
   on the message and replies in it.
2. Answer a few questions; confirm the goals it reads back.
3. In Composer:
   - the agent's **Activity** companion lists that thread under **Conversations**; click it to open the chat;
   - your **Person** properties list your goals (proposed, then confirmed) and memories;
   - a profile document exists for you.
4. In the agent's own Composer chat, ask what it knows about you; it reads the same objects.

## Troubleshooting

| Symptom                            | Check                                                                                                                                                                                                                                                                                                                                                                |
| ---------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Start returns 401/403              | Local EDGE may not accept a fresh identity. For a test, set `"EDGE_CONFIG": { "functions": { "noAuth": true } }` in the local-only block of `compute-service/wrangler.jsonc` (never commit) and `curl -X PUT localhost:8787/compute/discord/bots/<appId> -H 'content-type: application/json' -d '{"spaceId":"<spaceId>","binding":"echo://<spaceId>/<bindingId>"}'`. |
| Gateway not `ready`                | `GET localhost:8787/compute/discord/bots/<appId>` → `lastError`; usually a bad token or the Message Content intent is off.                                                                                                                                                                                                                                           |
| No reply in the thread             | Tail compute-service (the bot) and operation-service (the agent's tools); confirm `ensureThreadChat` is registered and the AI key was written by `pnpm dev:env`.                                                                                                                                                                                                     |
| Bundle errors in operation-service | A package lacks `dist/` or the link mixes versions: rebuild `<dxos>` and re-link with `--all`.                                                                                                                                                                                                                                                                       |
| Start/Stop do nothing in Composer  | The bot operations are browser-only; check the plugin is enabled and the page is on the local EDGE (`DX_EDGE_BASE_URL`).                                                                                                                                                                                                                                             |

## Without Discord or a model key

- **Interview, scripted:** the `stories-assistant` **Interview** story runs the interview skill against
  a scripted model and shows the profile filling in
  (`pnpm exec vitest run --project=storybook src/stories/Interview.stories.tsx` in
  `packages/stories/stories-assistant`).
- **Bot, fake Discord:** edge's compute-service workerd integration test runs the bot against a fake
  Discord (REST and gateway).
