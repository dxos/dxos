<!-- Copyright 2026 DXOS.org -->

# composer-e2e

The Composer browser suite as its own package, every test bound to an `.mdl` QA flow, and the
results trended in PostHog.

## Why a separate package

The behavioural suite was `composer-app:e2e`, a task on the application. That conflated three
things the app happens to host:

1. **Behavioural** specs asserting what the app does (`basic`, `collections`, `comments`, …).
2. **Measurement** harnesses recording numbers (`startup`, `perf-*`), which `check-boot-budget`,
   `check-startup-budget` and the perf nightly gate on.
3. A **storybook** regression (`welcome-focus`).

Only the first is a suite in the ordinary sense, and only the first should ever gate a merge on a
pass/fail. Splitting it out makes that separation structural rather than a comment in a config's
`testIgnore`, and gives the suite somewhere to own its page objects, its authoring rules and its
reporting.

Tiers 2 and 3 **stay in composer-app**, deliberately: they are coupled to the BUILD (a bundle
built without `DX_PWA=false` precaches ~30 MB mid-measurement) and to budget tasks that live
beside them. Moving them would put a project boundary through a measurement.

## The dependency direction

`composer-e2e:e2e` depends on `composer-app:bundle-e2e` — the suite serves the app's bundle
through `vite preview`. Therefore **composer-app must not depend on `@dxos/composer-e2e`**, or
moon's project graph cycles (it does, immediately: `would_cycle`).

The one thing the harness specs shared with the suite was `INITIAL_URL`, now declared in
`harness-helpers.ts`. A single string is not worth a package edge, let alone a cycle.

## Binding tests to QA flows

A `test QA-n` in an `.mdl` is the _specification_ of a journey; a Playwright spec is one unattended
_execution_ of it. The binding is declared on both sides and checked:

- spec side: a Playwright tag, `test('…', { tag: ['@QA-1'] }, …)`;
- spec-document side: a new `automated:` field on the `test` ext (`packages/reflect/deus/lang/qa.mdl`);
- `scripts/check-qa-coverage.mjs` fails when either side names something the other lacks, and when
  an `automated:` entry points at a `test.skip`.

Two-sided because a one-sided link rots silently: rename a test and the suite stays green while the
flow it claimed to cover stops being exercised. The tags are real Playwright tags, so
`--grep @QA-1` runs everything automating a flow with no extra machinery, and they ride into
PostHog as a dimension so a chart can name the broken _journey_.

Flows written for the specs that had none: QA-5 (first run and logout), QA-6 (collections),
QA-7 (a second device), QA-8 (two peers), QA-9 (the guided tours). `tables` and `inbox` bind to
their existing `PLUGIN.mdl` flows, `comments` to `review:QA-1`.

## Reporting

One `ci.e2e-test` event per test per browser, from Playwright's JSON report, published through
`scripts/ci-event.mjs` like every other CI trend in the repo — so uuid seeding, property
namespacing and the GitHub envelope live in exactly one place.

Only from `main`, and the nightly is the authoritative sample (it is the run where
`DX_E2E_RUN_ID` forces real execution instead of a cache replay). Dated by the RUN, not the commit.
Contract and tiles: `packages/e2e/composer-e2e/DASHBOARD.md`.
