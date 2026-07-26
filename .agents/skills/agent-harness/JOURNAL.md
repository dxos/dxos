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
