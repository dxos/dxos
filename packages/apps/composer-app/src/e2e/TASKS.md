# Composer e2e (Stagehand) — Tasks

_Resume: open the PR for branch `t3code/composer-e2e-stagehand` (migration + merge committed, 2 ahead of origin/main, tree clean). Uncommitted: none. Last: merged origin/main (resolved playwright/pnpm-lock conflicts + added `openai>zod` peer rule)._

## Phase 1: Migrate the e2e suite from Playwright to Stagehand

Replace the selector-based Playwright suite (`src/playwright`) with an AI-driven
Stagehand + vitest suite (`src/e2e`): plain-language `act` steps and schema-driven
`extract` assertions, no selector/retry layer, so tests survive markup churn. No
retries anywhere — flake rate must stay measurable.

### Tasks

- [x] **Author the Stagehand suite** — `src/e2e/{basic,collaboration,collections,comments,halo,startup,tables,welcome-focus}.spec.ts` + `composer.ts` peer factory + `session.ts` (temp-0 llmClient) + vitest configs; delete `src/playwright`.
- [x] **Wire moon tasks** — `e2e` (prod preview), `e2e-dev`, `e2e-welcome-focus`; no `e2e` tag (not the shared playwright preset).
- [x] **Size timeouts off the typical test, not the slowest** — global `testTimeout` 150s (~2× the ~77s single-peer median); per-suite `{ timeout: 480_000 }` on the multi-peer suites (collaboration, halo); inline `{ timeout: 210_000 }` on `reset device`.
- [x] **Set concurrency default** — `maxWorkers` 2 (`DX_E2E_WORKERS`). 3 and 4 mass-fail: concurrent cold boots saturate CPU and blow the `beforeEach` hook timeout on a 14-core/36GB machine.
- [x] **Validate empirically** — 3× @2 workers + 1× @3 workers (detached, cold cache on run 1). ~15 min/run @2. 21/23 green in all 3 runs; multi-peer tests run 120–180s (confirming the 480s override is required); ceiling confirmed at 2.
- [x] **Merge origin/main** — kept `playwright/collaboration.spec.ts` deleted; regenerated `pnpm-lock.yaml` from branch base (stagehand stays 3.6.0); added `openai>zod: '>=4.0.0'` peer rule (strict peers stay on repo-wide; suite runs green on zod 4).

## Phase 2: Stabilize & land

### Tasks

- [ ] **Open the PR** — `feat(composer-app): migrate e2e suite to Stagehand` (or `test(...)`); surface the Composer preview URL; monitor the Check workflow.
- [ ] **`warm-cold start` timing flake** — timed out at its fixed 120s benchmark budget in the slowest run (ran 30–45s in the others). It's a deterministic timing benchmark (no AI), so bump its budget to ~180s to remove the load-induced flake without hiding anything.
- [ ] **`edit message` extract flake** — "No object generated: response did not match schema" (~1/3 here, small sample). Baseline AI-layer nondeterminism under the no-retry policy. Decide: tighten the extract prompt/schema, or accept and let the flake rate stay visible (policy default).

### References

- Suite design + run instructions + assertion/flakiness policy: `src/e2e/README.md`.
- Startup benchmarks: `BENCHMARKS.md`.
- Convention memory: `composer-e2e-stagehand-style` (plain-language act/extract, no selector layer, no retries, temp 0).
- Consistency-run artifacts (local, transient): `/tmp/e2e-consistency/results2/` (per-run JUnit + logs).
