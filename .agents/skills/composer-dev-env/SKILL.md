---
name: composer-dev-env
description: >-
  Run a local Composer against the shared EDGE dev environment over HTTPS at
  https://local.composer.space/, sign in with a passkey, and connect the dev MCP server
  (mcp.dev.dxos.network) so the agent can read and write the same dev spaces. Use when asked
  to point local Composer at dev, to work against the dev MCP, to set up the local HTTPS cert,
  or when the dev MCP answers `whoami` but lists no operations.
---

# Local Composer against EDGE dev

The chain is: local Composer (HTTPS, trusted cert) → EDGE dev (hub, auth, sync) → dev MCP server
reading the same identity's spaces. The `dxos` plugin's `composer` MCP points at **production**
(`composer.dxos.network/mcp`); the dev MCP is a separate server and a separate identity.

## 1. Certificate (once per machine)

`local.composer.space` resolves to `127.0.0.1`. Vite loads `key.pem` / `cert.pem` from the repo
root of the worktree it serves when `HTTPS=true` (`packages/apps/composer-app/vite.config.ts`);
`*.pem` is gitignored.

```bash
mkcert -install
mkcert -cert-file cert.pem -key-file key.pem local.composer.space localhost 127.0.0.1 ::1
chmod 600 key.pem
```

Each worktree needs its own copy (or a copy of the pair) at its root.

## 2. Serve against dev on port 443

Vite defaults to 5173; `--port 443` makes the bare URL work (macOS lets an unprivileged user bind
443). Run it in the background — the first start builds dependencies for a minute or more.

```bash
HTTPS=true DX_EDGE_BASE_URL=https://dev.dxos.network/ DX_HUB_URL=https://dev.dxos.network/hub/ DX_AUTH_URL=https://account.dev.composer.space moon run composer-app:serve -- --port 443 --strictPort
```

Ready when the log prints `Local: https://local.composer.space:443/`. Verify without `-k`, which
also proves the cert is trusted: `curl -s -o /dev/null -w '%{http_code}' https://local.composer.space/`
→ `200`. `host: true` in the config also exposes it on the LAN address.

## 3. Account and passkey (the user does this)

The agent cannot sign in or create passkeys — hand these to the user:

1. Open https://local.composer.space/ and log in with a test email — this creates the account on dev.
2. Create a passkey, then use it.

## 4. Connect the dev MCP

```bash
claude mcp add --transport http composer-dev https://mcp.dev.dxos.network/mcp
```

This writes the project-local scope of `~/.claude.json`, not the repo. The user authorizes it
with the passkey (`/mcp` in an interactive `claude` terminal, or the app's connector settings); a
new session is needed for the tools to load. An unauthenticated `POST` returns `401` with OAuth
metadata at `/.well-known/oauth-protected-resource` — that means reachable, not broken.

Verify: `whoami` returns an identity **different** from the prod `composer` MCP, with the dev
spaces; then `queryOperations` (no arguments) lists `org.dxos.operation.space.addObject` and friends.

## Troubleshooting: `whoami` works but `queryOperations` / `loadSkill` return `[]`

`whoami`, `createUpload` and `createDownload` are static; everything else comes from EDGE's
`operation-service` over RPC. When that RPC fails, `mcp-space-service` serves an empty registry
(`edge/packages/services/mcp-space-service/src/mcp/gateway.ts`). Invoking by key then answers
`Unknown operation`. Confirm in SigNoz (the claude.ai SigNoz connector):

- `mcp-space-service`, body `operation registry unavailable; serving the static surface only`.
- The cause, in `operation-service` logs: filter
  `resource.deployment.environment = 'dev' AND service.name = 'operation-service' AND severity_text IN ('error', 'warn')`.
  A `PluginInitializationError` names the plugin that failed to activate; one failing plugin
  empties the whole registry.

A bundle path containing `.local-pack` means the deployed worker was built with
`pnpm link-packages` from a local dxos checkout; a version skew there is the usual culprit.
The fix is redeploying the dev worker from a consistent build — that touches the shared dev
environment, so confirm with the user first.

## Troubleshooting: an operation fails with `Query execution failed (queryCount=N)`

The message drops the cause. `wrangler tail` shows it, but only for requests made while the tail
is connected, so start it and then repeat the call:

```bash
cd ../edge/packages/services/operation-service && npx wrangler tail operation-service --format json
```

Look for the `query failed` log line and its `error` field. `QueryError: Query too complex` means
db-service's planner cannot run that query shape. The `child-of` query that `Task.collectTree`
issues broke `tasks.update` (starting or claiming a task) and `tasks.addArtifact` (attaching a
pull request) until dxos/edge#1192.

## Dev is deployed by hand, and deploys overwrite each other

No workflow deploys dev: every dev worker is whatever was last deployed from someone's checkout. A
fix that worked an hour ago can disappear when someone deploys a branch without it. Before
concluding that a fix does not work, check that it is still live:

```bash
npx wrangler deployments list --name db-service   # likewise operation-service, mcp-space-service
```

Deploy from a checkout of edge with `moon run <service>:deploy -- --env dev`, after merging
edge's `main` into your branch so the deploy rolls nobody's landed change back.
