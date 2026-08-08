---
name: cloud-sandbox
description: >-
  Working inside the Claude Code cloud sandbox (Claude Code on the web, remote sessions,
  scheduled runs). Use when CLAUDE_CODE_REMOTE is set; when `moon`, `gh`, or `oxfmt` are
  "command not found"; when Chromium or Playwright fails with ERR_CONNECTION_RESET or a TLS
  error against an HTTPS host that curl reaches fine; when /mode, /project, or the branch and
  worktree guard hooks appear to do nothing; or when a build or dev server unexpectedly
  triggers a full pnpm install.
---

# Working in the Claude Code cloud sandbox

The sandbox is an ephemeral Linux container that runs the agent with the repo cloned fresh at
`/home/user/<repo>`. It is not the environment `AGENTS.md` and `.claude/CLAUDE.md` assume, and
several of their instructions do not hold here. This skill lists every difference found so far.
(Facts below were measured in two independent sessions, 2026-08-07.)

## Detect it

`CLAUDE_CODE_REMOTE` is set, alongside `CLAUDE_CODE_REMOTE_ENVIRONMENT_TYPE` and a `CCR_*` family
(`CCR_AGENT_PROXY_ENABLED`, `CCR_EGRESS_GATEWAY_ENABLED`, …). Any of these means you are in the
sandbox. `/root/.ccr/README.md` also exists and documents the network proxy from the platform side.

## Project hooks do NOT run

`.claude/settings.json` hooks are inert in cloud sessions. Consequences:

- `.claude/hooks/mode.sh` never injects the `RESPONSE RULES` block, and `/mode terse|normal` does
  nothing. **Follow the response rules from `AGENTS.md` → "Responding to the user" by reading them
  directly** — nothing will re-inject them mid-session.
- `.claude/hooks/track.sh` never fires, so `/project …` does not work. Maintain `TASKS.md` /
  `DESIGN.md` by hand if the work needs tracking.
- `guard-branch.sh` and `guard-worktree.sh` do not deny anything. The Non-negotiables they back
  (never create/switch branches or worktrees, never edit while on `main`) still apply in full —
  **you are the only thing enforcing them now.** Check `git branch --show-current` before your
  first edit rather than relying on the guard.

There is also no `SessionStart` hook, so no `SESSION CONTEXT` block. `AGENTS.md` already covers
this: run `git rev-parse --show-toplevel && git branch --show-current` before any file op.

## Tooling not on PATH

`moon`, `gh`, and `oxfmt` are all missing. `pnpm` and `node` are present (`/opt/node22/bin`).

| `AGENTS.md` says                            | In the sandbox                                                        |
| ------------------------------------------- | --------------------------------------------------------------------- |
| `moon run <package>:<task>`                 | `pnpm exec moon run <package>:<task>` (or `./node_modules/.bin/moon`) |
| `gh run list --branch … --workflow "Check"` | `mcp__github__*` tools only — there is no `gh`                        |
| `pnpm format`                               | works (goes through pnpm); a bare `oxfmt` does not                    |

## Dependencies are installed but not built

The clone ships `node_modules` but no build outputs. The first `moon run <app>:serve` will run a
pnpm install and then build the whole dependency graph — expect 10+ minutes, not seconds. Bundled
sub-packages may still be missing afterward: `@dxos/shell` needs `moon run shell:bundle`
explicitly, or the app's shell entry 500s with
`Failed to resolve import "@dxos/shell/style.css"`. Build before you try to run anything, and
budget for it.

One trap this creates: a task whose inputs have not changed replays its cached result, so after
editing a library, e2e bundles pick the edit up only after the library actually rebuilds. When a
fix "doesn't work", first make sure the library rebuilt (plain `moon run <lib>:build` — file-hash
caching picks up source edits) and then rebuild the app's `bundle-e2e` before concluding anything —
a stale bundle has already produced one false verdict on a good fix. Do NOT reach for `--force`:
it cascades cache-bypass through the whole action graph and has raced one package's type-check
against another's concurrent rebuild (`Cannot find module '@dxos/app-framework/Capability'` on an
untouched checkout).

## One checkout, no worktrees

The repo lives at `/home/user/<repo>` on a branch the harness assigned (`claude/…`). There are no
worktrees, so the `branch == claude/<worktree-dir-name>` pairing convention in `AGENTS.md` cannot
hold — the directory is `dxos`, the branch is something else entirely. That is expected; do not
try to "fix" it. The rule that survives is the important one: never create or switch branches or
worktrees.

## The container is ephemeral

It is reclaimed after inactivity or when the session ends. Anything not committed and pushed is
gone. Push early rather than at the end of a long task.

## Network: everything HTTPS goes through a local proxy

Outbound HTTPS is only reachable via a local agent proxy on loopback — read the address from
`$HTTPS_PROXY` (the **port varies per session**; two observed sessions used 34301 and 44027, so
never hard-code it). Direct egress is refused. Loopback is in `no_proxy`, so localhost is direct
and unrestricted.

Tools that read `HTTPS_PROXY` (curl, pnpm, node with `NODE_USE_ENV_PROXY=1`) work with no changes.
See `/root/.ccr/README.md` for per-tool CA configuration. **Never disable TLS verification and
never unset `HTTPS_PROXY`.**

### Chromium and Playwright need two flags

Chromium does not read `HTTPS_PROXY`, so it must be pointed at the proxy explicitly. It then fails
a second time: the egress proxy resets Chromium's TLS 1.3 ClientHello mid-handshake
(`ERR_CONNECTION_RESET`; in a netlog, `SSL_HANDSHAKE_ERROR net_error=-101`). curl negotiates TLS
1.3 through the same proxy without trouble, so this is specific to Chromium's ClientHello.
Disabling ECH and the post-quantum key agreement (by feature flag and by managed policy) does not
help. Capping at TLS 1.2 does.

```bash
/opt/pw-browsers/chromium --headless --no-sandbox \
  --proxy-server="$HTTPS_PROXY" \
  --proxy-bypass-list="127.0.0.1;localhost" \
  --ssl-version-max=tls1.2 \
  --dump-dom https://example.com
```

Playwright:

```ts
const browser = await chromium.launch({
  // The image ships an older Chromium than Playwright's pin, which otherwise refuses to launch.
  executablePath: '/opt/pw-browsers/chromium',
  args: [
    '--no-sandbox',
    // Args form, NOT Playwright's `proxy:` option — that option drops its `bypass` list for pages
    // in a non-default context, sending the app's own localhost URL through the proxy (405, the
    // page renders the proxy's error text instead of the app).
    `--proxy-server=${process.env.HTTPS_PROXY}`,
    '--proxy-bypass-list=127.0.0.1;localhost',
    '--ssl-version-max=tls1.2',
  ],
});
```

Chromium is pre-installed at `/opt/pw-browsers/chromium` with
`PLAYWRIGHT_BROWSERS_PATH=/opt/pw-browsers`. Never run `playwright install` for chromium; firefox
and webkit are NOT pre-installed but `playwright install firefox webkit` plus
`playwright install-deps webkit` works, and both browsers then reach EDGE over `wss` with no
proxy configuration at all.

The TLS 1.2 cap is a workaround for a proxy-side defect, not a property of the browser — treat it
as temporary and re-test periodically.

### What works and what does not

Verified working through the proxy: HTTPS to `dxos.network` and `*.dxos.workers.dev`; CORS from a
`http://localhost:5173` origin (edge returns `access-control-allow-origin` for it); WebSocket
upgrades — `101 Switching Protocols` relays, and a Chromium `WebSocket` opened and round-tripped a
message. (`/root/.ccr/README.md` claims WebSocket upgrades are unsupported; that is outdated.)
An unauthenticated `wss://dxos.network/ws/<identityKey>/<peerKey>` gets edge's own
`401 WWW-Authenticate: VerifiablePresentation`, which means the handshake reached the worker.
Do NOT cite todomvc's green non-chromium playwright runs as proof that two-peer invitations work
here — its beforeEach aliases `guest = host` off chromium, so those runs never open a second peer.
Space invitations require a real WebRTC swarm connection (edge is signaling only, and
`@dxos/network-manager` has no edge-relay data transport). Same-host peers CAN connect on host
candidates (see above) — measured working on chromium with the launch fixes; webkit was measured
failing with both peers logging `connection.ts "timeout waiting 10s for transport to connect"`,
cause not yet isolated (webkit-side WebRTC vs. environment).

Does not work:

- **External UDP only** (measured 2026-08-08, superseding an earlier blanket "no WebRTC" claim):
  STUN binding to public servers times out, and `calls.dxos.network` TURN is policy-blocked — but
  **same-host WebRTC works**: two peers in the same browser on this host complete ICE on host
  candidates over the container's own interface, with the real `https://dxos.network/ice` config
  and its unreachable STUN/TURN listed. Two-peer playwright tests (invitation → WebRTC connect →
  replication) can therefore pass locally on chromium. Only flows needing NAT traversal to an
  external peer are impossible.
- **`calls.dxos.network`** — the egress gateway answers 502 to the CONNECT (policy denial). Calls
  and transcription features are unavailable.
- **`api.ipfs.dxos.network`, `gateway.ipfs.dxos.network`** — CONNECT is allowed but the origin
  resets; these look decommissioned rather than blocked.

The client logs recurring `EdgeConnectionClosedError` from the dedicated worker. Unexplained, and
it does NOT prevent invitations or replication from succeeding — do not mistake it for a proxy
problem or spend time on it when something else is failing.

Diagnose any blocked host with `curl -sS "$HTTPS_PROXY/__agentproxy/status"`, which lists recent
relay failures and the reason for each.

## Making the browser flags automatic

Three places in the repo launch Chromium. Adding sandbox-gated launch args means no one has to
remember this skill exists:

- `packages/common/test-utils/src/playwright.ts` — the chromium project of `e2ePreset`, inherited
  by every `e2e`-tagged suite (done — gated on `CLAUDE_CODE_REMOTE`).
- `vite.base.config.ts` — the `browser:` block for storybook tests (~line 390).
- `vite.base.config.ts` — the `browser:` block for `test-browser` unit tests (~line 504).

Gate on `process.env.CLAUDE_CODE_REMOTE` (or `CCR_AGENT_PROXY_ENABLED`). An unconditional
`--ssl-version-max=tls1.2` would silently downgrade real dev and CI runs. There is precedent for
setting a default centrally so callers don't have to remember it: `.moon/tasks/tag-e2e.yml` sets
`DX_PWA: 'false'` with exactly that rationale.
