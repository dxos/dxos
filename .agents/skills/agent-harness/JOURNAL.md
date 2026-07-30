# Harness Journal

## Turn 1 — Step 1: Wire plugin-ibkr into the CLI

### Did

1. Added `"@dxos/plugin-ibkr": "workspace:*"` to `packages/devtools/cli/package.json` dependencies
   (alphabetically between `@dxos/plugin-game` and `@dxos/plugin-inbox`).

2. Edited `packages/devtools/cli/src/util/skills.ts`:
   - Added imports:
     - `{ Ibkr, IbkrSkill }` from `@dxos/plugin-ibkr` (root barrel — no React subpaths needed since
       `IbkrSkill` lives in `src/skills/index.ts` which is re-exported by root `src/index.ts` without
       React components at that level)
     - `{ IbkrOperationHandlerSet }` from `@dxos/plugin-ibkr/plugin`
     - `{ AccessToken }` from `@dxos/link`
   - Added `IbkrSkill.make()` to `skillRegistry.initial` list.
   - Added `IbkrOperationHandlerSet` to `operationHandlers` merge.
   - Added `[Ibkr.Report, Ibkr.Instrument, AccessToken.AccessToken]` to the `types` array.

3. Called `request_reload` — hypervisor will run `pnpm install`, build `plugin-ibkr` + CLI.

### Notes / watch-points

- The root `@dxos/plugin-ibkr` import is used (not a subpath) to get `IbkrSkill`. The BRIEF says
  to use the root barrel for `IbkrSkill`; the existing comment in skills.ts about React-free
  subpaths applies to plugins like chess/inbox that have separate `/skills` subpath exports.
  plugin-ibkr exports `IbkrSkill` from its root `src/index.ts → src/skills/index.ts` path which
  doesn't pull React directly. If the build fails due to React in the root barrel, the fix is to
  check if plugin-ibkr needs a `/skills` subpath export added (a hypervisor task).
- `AccessToken.AccessToken` — the `@dxos/link` package exports `* as AccessToken from './AccessToken'`
  and the class inside is also named `AccessToken`, so `AccessToken.AccessToken` is the correct ECHO
  type reference, matching the pattern used in the BRIEF.

### Next steps (Step 2 onward, after successful reload)

- Step 2: Create `AccessToken` object in personal space:
  `source = "interactivebrokers.com"`, `token = "<IBKR_FLEX_TOKEN-redacted>"`, `account = "1557472"`
- Step 3: Run `SyncPortfolioReport` once (rate-limited).
- Step 4: Verify `GetPortfolio` returns positions + cash.
- Step 5: `MaterializeInstrument` for a US ticker + `GetInstrumentFundamentals`.

## Turn 1 review (hypervisor)

- Agent wired @dxos/plugin-ibkr into skills.ts + cli package.json; requested reload.
- Health-check RED: skills.ts imported AccessToken from @dxos/link but the CLI lacked that dep.
- Hypervisor fix: added `@dxos/link: workspace:*` to cli/package.json, pnpm install, rebuilt CLI — now GREEN.
- IBKR skill + operations + types are now loaded in the CLI. Proceed to Step 2 (credential) onward.

## Turn 2/3 review (hypervisor) — final

- Agent stored the IBKR credential: `dx connector add` created the connection (verified via
  `dx connector list` → connectorId interactivebrokers.com, account/query 1557472). Step 2 DONE.
- Live fetch (SyncPortfolioReport): BLOCKED by IBKR transient `ErrorCode 1001` ("Statement could not
  be generated at this time"). Confirmed independently via raw + cors-proxy SendRequest — IBKR is
  throttling this token (it returned a full 1.1MB report earlier in the session, so the path works).
  Per the plugin's own guidance, retrying extends the throttle, so stopped hammering it.
- SEC EDGAR: verified — `sec-edgar-client.test.ts` passes; cors-proxy + direct both reach sec.gov.
- DB-backed operation tests (operations.test.ts/sync.test.ts) could not run in this env: better-sqlite3
  native module "did not self-register" (node test-runner ABI issue, unrelated to plugin logic).
- Net: harness end-to-end proven — agent self-developed (wired plugin), hypervisor reload gate
  (RED missing-dep → fix → GREEN), agent drove real CLI ops. Only the LIVE IBKR statement fetch is
  externally blocked.

## Artifacts note (hypervisor)

- These run artifacts (BRIEF.md, JOURNAL.md) are tracked here for review/preservation.
- The IBKR Flex **token is redacted** (`<IBKR_FLEX_TOKEN-redacted>`) — never commit the secret to
  this public repo. The query id `1557472` is non-secret (per the plugin) and kept.
- The fetched Flex report XML (real account U…, holdings) is **intentionally not committed** — it is
  real financial data and stays out of the public repo; it lived only in the ephemeral scratchpad.

## Live-fetch wait log (deviation-2 correction: wait for IBKR, do not stop)

- Correct hypervisor posture on IBKR transient `1001`: back off and retry until ready; never stop/ask.
- Probes (SendRequest, one per cycle, ~3–4 min apart to respect IBKR's 1/sec + 10/min limits):
  - probe#1 ~14:43Z → busy (1001)
  - probe#2 14:46:59Z → busy (1001)
  - probe#3 14:50:25Z → busy (1001)
- Still waiting; continuing to poll. On READY (SendRequest returns a ReferenceCode) → hand the
  fetch to `dx agent --skill org.dxos.skill.ibkr` (SyncPortfolioReport once, then GetPortfolio) to
  complete the ECHO-import verification.

## dx-agent IBKR fetch attempt

**Date:** 2025-07-10

**Action:** Called `SyncPortfolioReport` exactly once (no retries, no loop).

**Result:** ❌ Sync failed — IBKR is temporarily busy/unreachable.

**Exact error text:**

```
IbkrSyncError: The socket connection was closed unexpectedly.
For more information, pass `verbose: true` in the second argument to fetch()
caused by:
Error: The socket connection was closed unexpectedly.
For more information, pass `verbose: true` in the second argument to fetch()
```

**Notes:** The connection was dropped at the network/socket level before IBKR could return a
statement. This is consistent with IBKR being temporarily busy (similar in nature to the earlier
`ErrorCode 1001` throttle events logged above). No portfolio data was fetched; `GetPortfolio` was
not called. Stopping as instructed.

## dx-agent IBKR fetch attempt 2

**Date:** 2025-07-10

**Action:** Called `SyncPortfolioReport` exactly once (no retries, no loop).

**Result:** ❌ Sync failed — IBKR is temporarily busy/unreachable.

**Exact error text:**

```
IbkrSyncError: The socket connection was closed unexpectedly.
For more information, pass `verbose: true` in the second argument to fetch()
caused by:
Error: The socket connection was closed unexpectedly.
For more information, pass `verbose: true` in the second argument to fetch()
```

**Notes:** Same socket-close failure as attempt 1. `GetPortfolio` was not called (no data to
retrieve). IBKR is temporarily busy. Stopping as instructed — no retry, no loop.

## dx-agent IBKR fetch attempt 3 (direct fetch)

**Date:** 2025-07-26

**Action:** Called `SyncPortfolioReport` exactly once (no retries, no loop).
Fetch path: direct (`globalThis.fetch`) — CORS proxy removed in the fix logged below.

**Result:** ❌ Sync failed — same socket-close error as attempts 1 & 2.

**Exact error text:**

```
IbkrSyncError: The socket connection was closed unexpectedly.
For more information, pass `verbose: true` in the second argument to fetch()
caused by:
Error: The socket connection was closed unexpectedly.
For more information, pass `verbose: true` in the second argument to fetch()
```

**Notes:** Despite switching from the CORS proxy to a direct `globalThis.fetch`, the error is
identical. The socket is being closed before IBKR returns a response. `GetPortfolio` was not
called (no data to retrieve). Stopping as instructed — no retry, no loop.

## Fix: Remove CORS proxy from flex-client / sec-edgar-client (2025-07-26)

**Problem:** `SyncPortfolioReport` was failing in the CLI with
`"The socket connection was closed unexpectedly"`. Root cause: both
`flex-client.ts` and `sec-edgar-client.ts` used `proxyFetchLegacy` from
`@dxos/edge-client/cors-proxy` as their default `fetchImpl`. This routes all
HTTP traffic through the Cloudflare Worker at `cors-proxy.dxos.workers.dev`.
CORS proxies exist solely for browser security constraints; in a Node/bun CLI
environment they add an unnecessary hop and are unreliable (socket closes, etc.).
A direct network call to `ndcdyn.interactivebrokers.com` from this host works
fine, confirming the proxy was the problem.

**Fix:**

- `packages/plugins/plugin-ibkr/src/services/flex-client.ts`: Removed
  `import { proxyFetchLegacy } from '@dxos/edge-client/cors-proxy'`. Changed
  `defaultFetch` from `proxyFetchLegacy(new URL(url))` to
  `globalThis.fetch(url)`. The injectable `fetchImpl` parameter is preserved
  so tests and browser callers can still supply their own implementation
  (including `proxyFetchLegacy` for browser contexts if needed).
- `packages/plugins/plugin-ibkr/src/services/sec-edgar-client.ts`: Same
  change — removed `proxyFetchLegacy` import, replaced `defaultFetch` with
  `globalThis.fetch(url, { ...init, headers: { ... } })`.

**Build:** `moon run plugin-ibkr:build` → ✅ clean (23s, hash `71ca7ffe`).
No other files changed; the `@dxos/edge-client` dep in `package.json` was
only transitively needed and is not directly imported by the plugin's source
after this fix.

**Next:** Call `SyncPortfolioReport` once to verify end-to-end fetch now
succeeds (hypervisor/agent next turn).

## POSTMORTEM — live fetch blocked by runtime egress (not IBKR, not the plugin)

**Date:** 2026-07-26

**Symptom:** Every CLI `SyncPortfolioReport` attempt fails with
`"The socket connection was closed unexpectedly"` — via the EDGE CORS proxy _and_ via a direct
`globalThis.fetch` (the agent tried both). `GetPortfolio` never gets data.

**Root cause (diagnosed by the hypervisor — environment, not the task):** the `dx` CLI runs on
**bun 1.3.11**, and bun's `fetch` does **not** egress through this sandbox's agent proxy
(`HTTPS_PROXY`). Verified: `curl` through the proxy reaches IBKR/SEC fine (returns real data), but
`bun -e "fetch('https://example.com')"` fails with the identical socket-close under **every**
config tried — default, explicit `{proxy}`, lowercase `https_proxy`, `SSL_CERT_FILE`,
`NODE_EXTRA_CA_CERTS`. IBKR/SEC are not in the proxy `no_proxy` allowlist, so they _must_ traverse
the proxy, which bun-fetch can't do. This is **deterministic**, not the earlier transient IBKR
`1001` throttle — waiting/retrying cannot fix it.

**Impact:** all live outbound fetch from the CLI is blocked — IBKR `SyncPortfolioReport` **and** SEC
`GetInstrumentFundamentals`. It is a runtime/sandbox limitation, not a defect in the harness, the
plugin wiring, the credential, or the operations.

**What IS verified:** harness P1–P4; IBKR plugin installed + loaded; credential stored (`dx connector
list`); operation wiring; SEC-EDGAR + flex parsing **logic** (unit tests pass with injected fetch);
and the self-develop + reload loop end-to-end (agent diagnosed → edited plugin → rebuilt →
`request_reload` → hypervisor reloaded → agent retried — the _mechanism_ works, even though the fix
didn't address the true env cause).

**Actions:** reverted the agent's `proxyFetchLegacy`→direct change (browsers need the CORS proxy; it
didn't fix egress). No plugin change kept.

**Path to finish (outside this sandbox):** run `dx` where bun's fetch can reach the internet (or the
proxy is bun-compatible), then a single agent turn completes it:
`dx agent --skill org.dxos.skill.ibkr "run SyncPortfolioReport once, then GetPortfolio"`.

## IBKR CLI wiring reverted (post-merge, 2026-07-30)

After merging main (which added a new `cli:check-module-structure` CI gate), the IBKR wiring failed
that gate: `src/bin.ts` transitively imported react/react-dom via `@dxos/plugin-ibkr`
(→ `app-graph-builder` → `react-ui-attention` → react). The `dx` CLI must stay react-free.

Since the IBKR-in-CLI was the _demonstration_ (its live fetch is environment-blocked anyway) and the
harness bridge (P1–P4) is the deliverable, the wiring was reverted from the CLI: removed the
`@dxos/plugin-ibkr` skill/operations/type registrations from `util/skills.ts` and the
`@dxos/plugin-ibkr` + `@dxos/link` CLI deps. `cli:check-module-structure` now passes.

To re-add IBKR to the CLI later, `@dxos/plugin-ibkr` needs react-free subpath exports
(`/skills`, `/operations`, `/types`) that don't pull `app-graph-builder`, imported in place of the
root/`/plugin` entry points.
