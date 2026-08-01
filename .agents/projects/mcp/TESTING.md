# mcp — Testing the Claude ⇔ MCP ⇔ EDGE ⇔ Composer loop

Two ways to authenticate a session against `mcp-space-service` (:8791). Path A is what works
today, fully scripted; Path B is the intended UX, currently blocked (see Blockers).

## Prerequisites (both paths)

```bash
cd ~/Code/dxos/edge
set -a; source .env; set +a
START_MCP=1 DX_PARALLEL_WRANGLER_DEV=1 moon run edge:dev
```

- Ports: edge 8787, ai 8788, tail 8789, hub 8790 (`START_HUB=1`), mcp 8791, operation 8792,
  log sink 8793. Logs → `packages/services/edge/edge-dev.log`.
- `.env` via `op inject -i .env.tpl -o .env` (`CLOUDFLARE_API_TOKEN` is required — the edge
  worker's `FUNCTIONS_DISPATCHER` dispatch namespace starts a remote proxy session).
- After a `git pull`: rebuild (`moon run edge-trace:build edge-platform:build
mcp-space-service:build operation-service:build`) and apply D1 migrations
  (`echo y | pnpm wrangler d1 migrations apply agent-registry --local --config wrangler.jsonc`
  in `packages/services/edge`; wipe `.wrangler` first if migrations conflict).
- Composer against the local edge:
  `DX_EDGE_BASE_URL=http://localhost:8787 moon run composer-app:serve` (dxos repo).

## Path A — OAuth stub with identity key (works, scripted)

The stub `/authorize` form takes a raw identity key (hex); `mcp-smoke.mjs` drives the whole
flow (dynamic client registration → PKCE → token → initialize → tools → create/read/update):

```bash
cd ~/Code/dxos/edge/packages/services/mcp-space-service
node scripts/mcp-smoke.mjs --url http://localhost:8791 \
  --identity <identityKeyHex> --space <spaceId> [--halo-space <haloSpaceId>] [--connect-only]
```

Finding the inputs for a Composer profile:

- **Identity key**: after the browser registers its agent, from D1 —
  `pnpm wrangler d1 execute agent-registry --local --config wrangler.jsonc --json --command
"SELECT * FROM UserAgent"` — or grep `edge-dev.log` for `identityKey`. NOTE: the identity key
  is a public key, but the dev stub treats knowledge of it as authorization — treat local-dev
  keys/logs as dev-only artifacts and never reuse an identity key from a shared environment.
- **Space id**: the personal space shows up as the busiest `B…` id in `edge-dev.log`
  (`queue-replicator` traffic), or from Composer devtools.
- **Agent required**: `/authorize` resolves the HALO space via
  `AGENTS_SERVICE.getAgentKey(ownerIdentityDid)`. No registered agent → `400 "No HALO space
found"`. Either reload Composer (onboarding `_createAgent` registers it) or pass
  `--halo-space` explicitly to bypass the lookup (the quieter `B…` id in the log next to the
  busy one is usually the HALO space).

Verified 2026-08-01: round-trips into both the browser-pane identity and the user's identity;
documents appear live in the Composer sidebar and edits flow both ways.

Cleanup (invalidates every key the stub would accept): stop the stack, then delete the local
plane and its logs — `rm -rf packages/services/edge/.wrangler packages/services/edge/edge-dev.log`
(re-apply D1 migrations on next start). Browser-side state clears via Composer's storage reset.

## Path B — `dx mcp connect` after device pairing (intended UX, blocked)

Intended: the CLI is a second device of the browser identity, so `dx mcp connect` needs no raw
key and `whoami`/documents target the same spaces.

```bash
cd packages/devtools/cli   # dxos repo
./bin/dx profile create --template local --name mcp-local   # edge url localhost:8787
DX_SOURCE=1 ./bin/dx -p mcp-local halo create --displayName <name>   # identity+agent+space
DX_SOURCE=1 ./bin/dx -p mcp-local halo share --open --host http://localhost:5173
# browser joins via ?deviceInvitationCode=…, then:
./bin/dx -p mcp-local mcp connect http://localhost:8791/mcp
./bin/dx -p mcp-local mcp tools
./bin/dx -p mcp-local mcp call whoami --input '{}'
```

### Blockers (2026-08-01)

1. **`halo create`/`share` are unregistered** — superseded-by-account-login comment in
   `plugin-client/src/commands/halo/index.ts`. Re-registration patch exists (uncommitted in the
   session worktree); run with `DX_SOURCE=1` so bun resolves TS sources.
2. **Composer `deviceInvitationCode` race** — FIXED in dxos (#12423 carries the merged fix:
   onboarding is the single param owner + reset-and-join dialog). Applies at runtime only when
   the served Composer includes the fix; a checkout without it (e.g. main before merge) still
   hangs on "Connecting…".
3. **CLI outside bun** — `tsx src/bin.ts` fails on `.tpl` imports from `@dxos/assistant`
   (bun-only text loader), so the p2p-under-bun question is untestable under node for now.
4. **`halo share --open`** swallows browser-launch failures and suppresses printing the
   invitation code — run without `--open` and open the printed URL manually.

### Sharp edges

- Auth-code invitations expire; regenerate rather than debugging stale codes.
- `whoami` reports `haloSpaceId` for the session — don't confuse it with the data space id.
- `querySpace` WORKS despite the README's BROKEN label; `listSpaces` untested.
- Since edge PR #785 the document tools are REPLACED by object CRUD (createObject/getObject/updateObject/deleteObject/queryObjects) + discovery (listPlugins/listTypes/listOperations). `updateObject` takes `properties` (field patch) or `edits` (text edits via markdown.update; non-markdown text types need the dxos pin ≥ dd552dfc74).
