<!-- Copyright 2026 DXOS.org -->

# composer-e2e — tasks

## Phase 1 — extraction

- [x] Create `packages/e2e/composer-e2e` (`@dxos/composer-e2e`, private, `layer: library`)
- [x] Move the behavioural specs, `app-manager.ts`, `plugins/` and `playwright.config.ts`
- [x] Point the config's `webServer` at composer-app's `vite preview`; dep on `composer-app:bundle-e2e`
- [x] Drop the `e2e` tag from composer-app; leave `e2e-startup` / `e2e-perf` / `e2e-dev` / `e2e-welcome-focus`
- [x] Break the reverse dependency (`INITIAL_URL` into `harness-helpers.ts`) — moon `would_cycle`
- [x] Retarget the CI `composer` shard to `composer-e2e:e2e`

## Phase 2 — QA flows

- [x] Add the `automated:` field to the `test` ext in `qa.mdl`, with its rules
- [x] Write QA-5 … QA-9 in `APP.mdl`; add the `multi-peer` and `onboarding` suites
- [x] Tag all 38 tests with `@QA-n`; bind `review`, `table` and `inbox` PLUGIN.mdl flows
- [x] `scripts/check-qa-coverage.mjs`, two-sided and wired into CI

## Phase 3 — docs

- [x] `BEST-PRACTICES.md`, distilled from the existing specs
- [x] `DASHBOARD.md`, the event contract and tile semantics

## Phase 4 — PostHog

- [x] `src/report.ts` — Playwright JSON report → `ci.e2e-test` events, with unit tests
- [x] `scripts/publish-results.mjs` — batch through `scripts/ci-event.mjs`, never fails the build
- [x] CI step, gated to `main`, `always()`
- [x] Dashboard 963444: stacked outcomes per run + currently-failing table

## Follow-ups

- [ ] Restore `inbox.spec.ts` by seeding the mailbox instead of syncing it (sync moved to EDGE, so
      `page.route` is never reached) — the `describe` is skipped today and the flow's `automated:`
      list is therefore empty of it.
- [ ] `tables.spec.ts` is `describe.skip` with a bare "Fix table tests" TODO; either fix or record
      the cause, per the skip rule in BEST-PRACTICES.md.
- [ ] Four more specs are chromium-only (`collections` × 2, `basic`, `halo`); #7387 is the named
      cause for one of them, the others are unattributed.
- [ ] Consider a `ci.e2e-run` companion event if a "suite duration" trend is ever wanted — do NOT
      derive it by summing `ciDurationMs`, which excludes fixture and boot time.
- [ ] Trend the startup/perf harnesses too (@wittjosiah on #13247). They need their own event —
      `ci.e2e-test` carries `ciStatus`/`ciDurationMs`, where a startup sample is milliseconds and
      module counts against a budget line, with no pass/fail to stack. Emit `ci.startup` from the
      report `collectStartupReport` already writes and give it its own tile.
