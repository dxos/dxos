---
name: cloud-sandbox
description: >-
  Working inside the Claude Code cloud sandbox (Claude Code on the web, remote sessions,
  scheduled runs). Use when CLAUDE_CODE_REMOTE is set; when `moon`, `gh`, or `oxfmt` are
  "command not found"; when Chromium or Playwright fails with ERR_CONNECTION_RESET or a TLS
  error against an HTTPS host that curl reaches fine; when /dxos:project answers `Unknown
  command` or a plugin's skills are missing from the session; or when a build or dev server
  unexpectedly triggers a full pnpm install.
---

# Working in the Claude Code cloud sandbox

The sandbox is an ephemeral Linux container running the agent against a fresh clone at
`/home/user/<repo>`. It is not the environment `AGENTS.md` and `.claude/CLAUDE.md` assume, and
several of their instructions do not hold here.

## Detect it

`CLAUDE_CODE_REMOTE` is set, alongside `CLAUDE_CODE_REMOTE_ENVIRONMENT_TYPE` and a `CCR_*` family
(`CCR_AGENT_PROXY_ENABLED`, `CCR_EGRESS_GATEWAY_ENABLED`, …). Any of these means the sandbox.
`/root/.ccr/README.md` documents the network proxy from the platform side.

## Project hooks run; plugins do not install themselves

`.claude/settings.json` hooks fire here as they do locally: `mode.sh` injects the `RESPONSE RULES`
block on every prompt, so `/mode terse|normal` works, and `guard-branch.sh` / `guard-worktree.sh`
deny edits whose target working tree is on `main`. They are a backstop, not a guarantee — check
`git branch --show-current` before the first edit.

`~/.claude` does not survive a fresh container. It starts with an empty `installed_plugins.json`
and only the official marketplace known, and `enabledPlugins` / `extraKnownMarketplaces` in
`.claude/settings.json` only _declare_ a plugin — nothing fetches one. Every plugin listed there
is therefore absent: `/dxos:project` answers `Unknown command`, and the skills those plugins ship
(`task-planning`, `superpowers:*`) are missing from the session's skill list. Skills committed to
the repo arrive by a different route — the `.claude/skills -> ../.agents/skills` symlink — and
are always there.

The repo's bootstrap registers the marketplace from the local checkout (no network) and installs.
It is idempotent:

```bash
bash .claude/scripts/bootstrap-plugins.sh
```

Installing does not retrofit the running session; a fresh session in the same container is the
first to see the plugin. `.config/claude-code-setup.sh` runs the same script, so where the
environment's setup command is wired the install lands in the cached image and the first session
already has it.

`claude plugin uninstall` and `claude plugin marketplace remove` **rewrite tracked
`.claude/settings.json`**, stripping the `dxos` entries out of `enabledPlugins` and
`extraKnownMarketplaces`. `git diff` after either, and restore. `add` and `install` leave the file
alone.

No `SessionStart` hook emits a `SESSION CONTEXT` block: run
`git rev-parse --show-toplevel && git branch --show-current` before any file op.

## Tooling not on PATH

`pnpm` and `node` are present (`/opt/node22/bin`); `gh` is not. `proto`, `moon`, and
`node_modules` exist only where the environment's setup command ran
`.config/claude-code-setup.sh`; without it `pnpm exec moon` fails too. Establish which case you
are in before concluding a command is broken:

```bash
command -v proto moon; ls node_modules | wc -l   # 0 => setup never ran
```

| `AGENTS.md` says     | Setup ran                      | Setup did not run                             |
| -------------------- | ------------------------------ | --------------------------------------------- |
| `moon run <pkg>:<t>` | `pnpm exec moon run <pkg>:<t>` | `bash .config/claude-code-setup.sh` (10+ min) |
| `pnpm format`        | works                          | `pnpm dlx oxfmt@0.63` — matches the root pin  |
| `gh run list …`      | `mcp__github__*` tools only    | same — there is no `gh` either way            |

GitHub's REST API is **also unreachable from the shell**: `curl https://api.github.com/…` returns
`GitHub access is not enabled for this session`, with or without a token. Never build a poll loop or
`Monitor` around it — it fails identically whether CI is red, green, or still running, so silence
means nothing. Read run status through the `mcp__github__*` tools, which go through the server side.

### `moon` itself may not run at all

moon loads its `javascript`/`bun` toolchains as WASM plugins from ghcr, whose blob host
(`pkg-containers.githubusercontent.com`) the egress gateway answers 403 to. When it does, EVERY
`pnpm exec moon run …` dies with `plugin::loader::registry::load_failure` — build, test and lint
are all unavailable, and nothing can be validated the normal way. Confirm with
`curl -sS "$HTTPS_PROXY/__agentproxy/status"` (the host appears under `recentRelayFailures`).

Fallback: typecheck against SOURCES instead of built `dist/types`, via the `source` export
condition every `@dxos` package declares. Write a throwaway config in the package, run it, delete it:

The `extends` path is relative to the package, so count the directories: three levels for
`packages/plugins/plugin-x`, four for `packages/core/compute/nlp`. Get it wrong and tsc fails before
it type-checks anything.

```jsonc
// packages/plugins/<pkg>/tsconfig.check.json — three levels deep; add a `../` per extra level
{
  "extends": "../../../tsconfig.base.json",
  "compilerOptions": {
    "composite": false,
    "incremental": false,
    "declaration": false,
    "declarationMap": false,
    "sourceMap": false,
    "emitDeclarationOnly": false,
    "noEmit": true,
    "customConditions": ["source"],
    "types": ["node", "vite/client"],
    "skipLibCheck": true,
  },
  "include": ["dx.config.ts", "src/**/*.ts", "src/**/*.tsx"],
}
```

Run it so the filter cannot swallow the verdict — in a pipeline the shell reports `grep`'s status,
not `tsc`'s, so a real failure reads as success whenever the filter matches nothing:

```bash
pnpm exec tsc -p tsconfig.check.json > /tmp/tsc.log; status=$?; grep -E "^(src|dx\.config)" /tmp/tsc.log; exit $status
```

The filter narrows the output to the package's own paths. The hundreds of `../../…` errors are pre-existing and not yours: codegen'd packages
(`@dxos/protocols`) have no sources to resolve. This catches real type errors but is NOT the build
— no vite, no declaration emit, no project references — so say so when reporting.

`pnpm exec oxlint <paths>` and `pnpm format` still work; neither goes through moon.

## Nothing is prebuilt, and `node_modules` may be missing

The clone ships no build outputs, and `node_modules` only where the setup command ran. A first
`moon run <app>:serve` runs a pnpm install and then builds the whole dependency graph — expect
10+ minutes. Bundled sub-packages may still be missing afterward: `@dxos/shell` needs
`moon run shell:bundle` explicitly, or the app's shell entry 500s with
`Failed to resolve import "@dxos/shell/style.css"`. Build before running anything, and budget
for it.

A task whose inputs have not changed replays its cached result, so after editing a library, e2e
bundles pick the edit up only once the library actually rebuilds. When a fix "doesn't work", confirm
the library rebuilt (plain `moon run <lib>:build` — file-hash caching picks up source edits) and
rebuild the app's `bundle-e2e` before concluding anything; a stale bundle reads as a failed fix. Do
NOT reach for `--force`: it cascades cache-bypass through the whole action graph and can race one
package's type-check against another's concurrent rebuild (`Cannot find module
'@dxos/app-framework/Capability'` on an untouched checkout).

A type error in a file your change never touched is usually an unbuilt dependency, not a real error
— build that package before "fixing" the type.

## One checkout, no worktrees

The repo lives at `/home/user/<repo>` on a harness-assigned `claude/…` branch. There are no
worktrees — the directory is the repo name and the branch is something else. As in a local
session, the directory and branch names are not expected to match; do not try to fix it. The
rule that survives is the important one: never create or switch branches or worktrees.

## The container is ephemeral

It is reclaimed after inactivity or when the session ends. Anything not committed and pushed is
gone. Push early rather than at the end of a long task.

### Container size can change across restarts

A worker restart can land the session on a **different-sized container** — for example from a box
that sustains 2-worker composer e2e to a 4-core box where the same command starves itself (load
average above 6, planks never rendering, boots timing out, most failures unrelated to the code under
test). Measurements from different boxes are not comparable, and a 4-core box cannot run 2-worker
composer e2e at all.

After any restart, before trusting or comparing a local test result:

```bash
nproc && uptime   # cores changed or load already high => re-baseline, or move validation to CI
```

### The checkout can silently revert mid-session

The working tree can be found at an **older commit than the branch has already pushed** — tens of
commits behind, with `origin` intact. Nothing warns you: `git status` reads clean because the tree
is consistent, just old. Every local measurement taken in that window runs pre-fix code while
appearing to test the tip, and a commit made there lands on a stale base.

The tells are indirect: a file missing an edit you know you made, `git log -- <file>` showing only
upstream commits, or a SHA you created reported as `unknown revision`. **A local
`unknown revision`/`not a valid object name` means "not fetched", not "does not exist" — `git fetch`
before concluding a commit is gone.**

Before trusting any local test result, and before committing:

```bash
git merge-base --is-ancestor <a-commit-you-know-you-made> HEAD && echo current || echo STALE
git fetch origin <branch> && git log --oneline -1 origin/<branch>   # compare with HEAD
```

Recover with `git merge --ff-only origin/<branch>` (never a fresh branch or worktree). Then
**rebuild before re-measuring**: the bundle on disk may have been built from either revision, and a
stale `out/<app>` presents as `vite preview: directory does not exist`, not as a test failure.

## Network: everything HTTPS goes through a local proxy

Outbound HTTPS is reachable only via a local agent proxy on loopback — read the address from
`$HTTPS_PROXY`; the **port varies per session**, so never hard-code it. Direct egress is refused.
Loopback is in `no_proxy`, so localhost is direct and unrestricted.

Tools that read `HTTPS_PROXY` (curl, pnpm, node with `NODE_USE_ENV_PROXY=1`) work unchanged. See
`/root/.ccr/README.md` for per-tool CA configuration. **Never disable TLS verification and never
unset `HTTPS_PROXY`.** Diagnose a blocked host with `curl -sS "$HTTPS_PROXY/__agentproxy/status"`,
which lists recent relay failures and the reason for each.

### Chromium and Playwright need two flags

Chromium does not read `HTTPS_PROXY`, so point it at the proxy explicitly. It then fails a second
time: the egress proxy resets Chromium's TLS 1.3 ClientHello mid-handshake (`ERR_CONNECTION_RESET`;
`SSL_HANDSHAKE_ERROR net_error=-101` in a netlog). curl negotiates TLS 1.3 through the same proxy
fine, so this is specific to Chromium's ClientHello; disabling ECH and post-quantum key agreement
does not help, and capping at TLS 1.2 does. This is a proxy-side defect rather than a browser
property — re-test periodically, but it still reproduces.

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
    // in a non-default context, sending the app's own localhost URL through the proxy (405, so the
    // page renders the proxy's error text instead of the app).
    `--proxy-server=${process.env.HTTPS_PROXY}`,
    '--proxy-bypass-list=127.0.0.1;localhost',
    '--ssl-version-max=tls1.2',
  ],
});
```

Browsers live under `PLAYWRIGHT_BROWSERS_PATH=/opt/pw-browsers`, with Chromium always pre-installed
— never run `playwright install` for it. Check that directory for firefox/webkit before assuming
they are absent; when they are, `playwright install firefox webkit` plus
`playwright install-deps webkit` works, and both then reach EDGE over `wss` with no proxy
configuration at all.

`e2ePreset` in `packages/common/test-utils/src/playwright.ts` already applies the chromium launch
args, gated on `CLAUDE_CODE_REMOTE`, so every `e2e`-tagged suite inherits them. Two call sites in
`vite.base.config.ts` do not — the `browser:` blocks for storybook tests and for `test-browser` unit
tests — so those still need the flags passed by hand in the sandbox. Gate any new call site on
`process.env.CLAUDE_CODE_REMOTE` (or `CCR_AGENT_PROXY_ENABLED`): an unconditional
`--ssl-version-max=tls1.2` would silently downgrade real dev and CI runs.

### What works and what does not

Working through the proxy: HTTPS to `dxos.network` and `*.dxos.workers.dev`; CORS from a
`http://localhost:5173` origin (edge returns `access-control-allow-origin` for it); WebSocket
upgrades — `101 Switching Protocols` relays, and a Chromium `WebSocket` round-trips a message.
(`/root/.ccr/README.md` says WebSocket upgrades are unsupported; that is outdated.) An
unauthenticated `wss://dxos.network/ws/<identityKey>/<peerKey>` gets edge's own
`401 WWW-Authenticate: VerifiablePresentation`, which means the handshake reached the worker.

Not working:

- **External UDP.** STUN binding to public servers times out and `calls.dxos.network` TURN is
  policy-blocked, so any flow needing NAT traversal to an external peer is impossible. **Same-host
  WebRTC does work**: two peers in the same browser complete ICE on host candidates over the
  container's own interface, with the real `https://dxos.network/ice` config and its unreachable
  STUN/TURN listed. Two-peer Playwright tests (invitation → connect → replication) therefore can
  pass locally on chromium; webkit peers have been measured failing with
  `connection.ts "timeout waiting 10s for transport to connect"` on both sides, cause unisolated
  (webkit WebRTC vs. environment).
- **`calls.dxos.network`** — the egress gateway answers 502 to the CONNECT (policy denial), so calls
  and transcription are unavailable.
- **`api.ipfs.dxos.network`, `gateway.ipfs.dxos.network`** — CONNECT is allowed but the origin
  resets; these look decommissioned rather than blocked.

Two-peer suites (composer `collaboration.spec.ts`, todomvc `basic.spec.ts`) do open a real second
peer on every browser, so their local results are meaningful on chromium — but absolute failure
rates measured here are inflated by the missing STUN/TURN, so treat a local rate as a comparison
between suites, never as a production number.

The client logs recurring `EdgeConnectionClosedError` from the dedicated worker. It does NOT prevent
invitations or replication from succeeding — do not mistake it for a proxy problem when something
else is failing.
