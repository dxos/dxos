# @dxos/stories-agent

Storybook stories that prototype agents on Discord end to end: installing the DXOS Discord app (Kai) in a server,
connecting Discord channels to an agent in a durable test space, and talking to the agent from Discord, all against a
locally running EDGE stack. Design: [plugin-agent `docs/DISCORD.md`](../../plugins/plugin-agent/docs/DISCORD.md).

## Setup

You need a dxos checkout (this repo, `<dxos>` below), an edge checkout on a branch with the Discord bot bindings
(`claude/discord-bot-channel-refs`, `<edge>` below), Chrome, and access to the `eng` and `eng-dev` 1Password vaults.

### 1. The Discord app (Kai)

Kai is application `1555777706459660288`
([Developer Portal](https://discord.com/developers/applications/1555777706459660288/information)). Its secrets are in
two 1Password items named `com.discord.bot.kai`:

| Reference | What | Used by |
| --- | --- | --- |
| `op://eng-dev/com.discord.bot.kai/credential` | bot token | the EDGE bot (`DISCORD_BOT_TOKEN_DEV`, via `pnpm dev:env`) |
| `op://eng/com.discord.bot.kai/APPLICATION_ID` | application id | `.env.tpl` (`DISCORD_KAI_APPLICATION_ID`) |
| `op://eng/com.discord.bot.kai/CLIENT_SECRET` | OAuth2 client secret | `.env.tpl` (`DISCORD_KAI_CLIENT_SECRET`), for **Connect Discord** |

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

1. Link this dxos workspace (build it first: `moon exec --on-failure continue --quiet :build` in `<dxos>`):

   ```bash
   node scripts/link-packages.mjs <dxos> --all --install
   ```

2. Point kms-service's **local** Discord OAuth at Kai:
   - `packages/services/kms-service/wrangler.jsonc`, top-level `vars`: `"DISCORD_CLIENT_ID": "1555777706459660288"`.
   - `packages/services/kms-service/secrets.jsonc`, `env[""].secrets`:
     `"DISCORD_CLIENT_SECRET": "op://eng/com.discord.bot.kai/CLIENT_SECRET"`.

3. Write the secrets (1Password asks you to approve each command):
   - Every worker's `.env`, including the bot token (`DISCORD_BOT_TOKEN_DEV`):

     ```bash
     pnpm dev:env
     ```

   - Kai's OAuth values, from the repo's `.env.tpl` into `<edge>/.env` (gitignored):

     ```bash
     op inject -i .env.tpl -o .env --force
     ```

     then copy the client secret into kms-service's local `.env` as `DISCORD_CLIENT_SECRET` (the value is never
     printed):

     ```bash
     node -e "const fs=require('node:fs');const v=fs.readFileSync('.env','utf8').match(/DISCORD_KAI_CLIENT_SECRET=\"?([^\"\n]+)/)[1];const p='packages/services/kms-service/.env';const l=(fs.existsSync(p)?fs.readFileSync(p,'utf8'):'').split('\n').filter(x=>x&&!x.startsWith('DISCORD_CLIENT_SECRET='));l.push('DISCORD_CLIENT_SECRET='+v);fs.writeFileSync(p,l.join('\n')+'\n',{mode:0o600})"
     ```

   - kms-service builds its ATPROTO handler for every OAuth flow, so it also needs `ATPROTO_CLIENT_JWK_BASE64`.
     `pnpm dev:env` does not write one locally; any P-256 key pair will do for Discord:

     ```bash
     node -e "const c=require('node:crypto');const k=c.generateKeyPairSync('ec',{namedCurve:'P-256'});const v=Buffer.from(JSON.stringify({publicKey:k.publicKey.export({format:'jwk'}),privateKey:k.privateKey.export({format:'jwk'})})).toString('base64');const fs=require('node:fs');const p='packages/services/kms-service/.env';const l=(fs.existsSync(p)?fs.readFileSync(p,'utf8'):'').split('\n').filter(x=>x&&!x.startsWith('ATPROTO_CLIENT_JWK_BASE64='));l.push('ATPROTO_CLIENT_JWK_BASE64='+v);fs.writeFileSync(p,l.join('\n')+'\n',{mode:0o600})"
     ```

     Run these after `pnpm dev:env`, which rewrites the `.env` files.

4. Give the stack its own state directory, so story spaces never mix with your everyday local world, then migrate and
   start it (EDGE listens on `:8787`):

   ```bash
   export DX_DEV_STATE_DIR=~/.local/state/dxos/edge/dev-state-agent-discord
   ```

   ```bash
   node scripts/stack.mjs migrate && node scripts/stack.mjs start
   ```

   Use the same `DX_DEV_STATE_DIR` for every `stack.mjs` command (`restart`, `stop`).

Steps 1–2 are local-only: never commit the `file:` overrides in `package.json`/`pnpm-lock.yaml` or the kms-service
edits. Undo them with `git checkout -- package.json pnpm-lock.yaml packages/services/kms-service && pnpm install`.
Re-link (step 1) after changing dxos code that runs on EDGE (plugin-agent operations and skills, `agent-runtime`,
`assistant`); Composer-only changes need no re-link.

### 3. Storybook

From `<dxos>`:

```bash
moon run storybook-react:serve
```

Open the stories in **Chrome** at `http://localhost:9009/?path=/story/stories-stories-agent-…`. The stories use
persistent storage, which runs the client in a SharedWorker; the Claude desktop app's built-in browser blocks
SharedWorker requests, so they cannot boot there.

### 4. Check the bot

With the bot token in your shell (`export DISCORD_BOT_TOKEN="$(op read -n op://eng-dev/com.discord.bot.kai/credential)"`),
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
| **Could not reach EDGE** with a 403 | Another space owns the bot (the last tab to bind or start it). |
| **Could not reach EDGE**, every request failing | The stack is down: `node scripts/stack.mjs status`, then `start` (with the same `DX_DEV_STATE_DIR`). |
| The story never finishes loading, "coordinator worker error" | Opened in the Claude desktop app's browser; use Chrome. |
| **Connect Discord** fails at Discord | The redirect URL (§1.1) is missing, or kms-service has no client secret (§2.3). |
| **Discord setup failed** on **Connect Discord**, `MissingBindingError` in the EDGE log | kms-service's `.env` lacks a value it reads (§2.3), e.g. `ATPROTO_CLIENT_JWK_BASE64`. |
| Messages arrive with no text | Message Content Intent is off (§1.2). |
