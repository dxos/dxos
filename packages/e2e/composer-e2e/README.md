# Composer end-to-end tests

The behavioural browser suite for the Composer app (`packages/apps/composer-app`): it drives the
real app in chromium, firefox and webkit against the production bundle.

```bash
DX_PWA=false moon run composer-e2e:e2e
```

Add `--inspect` to step through a test. `PLAYWRIGHT_BROWSER=webkit` (or `chromium` / `firefox`)
targets one browser; the default in CI is all three, one cell each.

- **[`BEST-PRACTICES.md`](./BEST-PRACTICES.md)** — how to write a test here. Read it first.
- **[`DASHBOARD.md`](./DASHBOARD.md)** — the `ci.e2e-test` event contract and the PostHog tiles.

Every test is the automated arm of a `test QA-n` flow in an `.mdl` spec, bound by a Playwright tag
and the flow's `automated:` field; `node scripts/check-qa-coverage.mjs` checks both sides. A
skipped test keeps its tag but is left out of `automated:` — it is not coverage while it does not
run. `--grep @QA-1` runs everything that automates one flow.

The **measurement** harnesses are not here — `startup.spec.ts`, `perf-*.spec.ts` and
`dev-*.spec.ts` stay in composer-app beside the budget tasks that gate on them, because a number
must never gate a merge from this suite.

Note: the webkit boot path is sensitive to plugin chunk-graph shape. Plugins should keep their
top-level `Plugin.ts` static imports minimal and put module `activate` bodies behind
`Capability.lazy` — broad top-level imports can shift bundler chunk ordering and trip ESM init
order in Linux webkit.
