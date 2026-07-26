# Task brief — IBKR portfolio into the DXOS CLI

You are the Composer agent running under the hypervisor. Goal: make the `dx` CLI able to
fetch the user's Interactive Brokers portfolio and read SEC EDGAR fundamentals, by installing
(wiring) the existing `@dxos/plugin-ibkr` plugin into the CLI, then using it.

Maintain your progress in `/home/user/dxos/.harness/JOURNAL.md` (append one entry per turn: did /
decided / blocked). Read it first each turn — each `dx agent` run is a fresh session.

## Facts you can rely on
- The plugin already exists at `packages/plugins/plugin-ibkr` and builds. Do NOT rewrite it.
- The CLI wiring file is `packages/devtools/cli/src/util/skills.ts`. It manually collects skills,
  operation handlers, and ECHO types (Composer does this via plugins; the CLI does not).
- Exports you need (all React-free):
  - `@dxos/plugin-ibkr` (root) → `IbkrSkill` (a `Skill.Definition`, call `IbkrSkill.make()`),
    and the type namespaces `Ibkr` and `IbkrOperation`.
  - `@dxos/plugin-ibkr/plugin` → `IbkrOperationHandlerSet`.
  - The credential type is `AccessToken` from `@dxos/link`.
- IBKR Flex credentials (task inputs): token `<IBKR_FLEX_TOKEN-redacted>`, queryId `1557472`.
  The sync operation reads them from an `AccessToken` object in the space where
  `source = "interactivebrokers.com"`, `token = <token>`, `account = <queryId>`.

## Step 1 — wire the plugin into the CLI (this turn)
1. Add the dependency to `packages/devtools/cli/package.json`: `"@dxos/plugin-ibkr": "workspace:*"`
   in `dependencies` (keep the list alphabetically sorted).
2. Edit `packages/devtools/cli/src/util/skills.ts`:
   - import `{ IbkrSkill }`, `{ Ibkr, IbkrOperation }` from `@dxos/plugin-ibkr`, and
     `{ IbkrOperationHandlerSet }` from `@dxos/plugin-ibkr/plugin`; also `{ AccessToken }` from
     `@dxos/link` if not already imported.
   - add `IbkrSkill.make()` to the `skillRegistry` initial list.
   - add `IbkrOperationHandlerSet` to the `operationHandlers` merge.
   - add the IBKR ECHO types to the `types` array: `Ibkr.Report`, `Ibkr.Instrument`, and
     `AccessToken.AccessToken` (check `packages/plugins/plugin-ibkr/src/types/Ibkr.ts` for the exact
     exported schema names before writing).
3. Do NOT run pnpm install or the build yourself — that is heavy lifting the hypervisor does. When
   your edits are complete and look right, call `request_reload` with a short reason. The hypervisor
   will run `pnpm install`, build `plugin-ibkr` and the CLI, and continue you. If the build fails it
   will hand you the error to fix.

## Later steps (after reload — do NOT attempt before the plugin is loaded)
- Step 2: store the IBKR credential by running (via the bash tool, from the repo root):
  `packages/devtools/cli/bin/dx connector add --source interactivebrokers.com --account 1557472 --token <IBKR_FLEX_TOKEN-redacted>`
  This creates the `AccessToken` (source→service, account→queryId, token→secret) the sync reads.
  Then confirm with `packages/devtools/cli/bin/dx connector list`.
- Step 3: run the sync to fetch the portfolio from IBKR (SyncPortfolioReport). It is rate-limited —
  run it at most once, never in a loop.
- Step 4: verify the portfolio imported into ECHO (GetPortfolio returns positions + cash).
- Step 5: verify SEC EDGAR works — materialize an instrument for a US ticker held in the portfolio
  (e.g. GOOG or META) and fetch its fundamentals (GetInstrumentFundamentals).

Keep the journal current so you can resume after each reload.
