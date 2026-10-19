---
branch: dm/ecstatic-galileo-mqm193
commit: e7e77779daa9463e7bcdf51f231372b4653b3f4c
base: b72c745d4912035d0622a4ab34da7b961a55af51
mode: fast
createdAt: 2026-10-02T09:07:57.344Z
isFinalized: true
groups: 55
rules: [moon-yml-entrypoint-registration, structured-logging-not-console]
reviewId: e7e77779
---

_0 error(s), 2 warning(s)._

## Index

<!-- `- <id> - unresolved|ignored|resolved - <rule> - <file:line[:col]>` -->

- e7e77779-1 - ignored - structured-logging-not-console - packages/core/echo/echo-client-e2e/src/bench-score/cli.ts:89
- e7e77779-2 - ignored - moon-yml-entrypoint-registration - packages/e2e/perf-harness/package.json:13

## Issues

# WARN e7e77779-1 structured-logging-not-console `packages/core/echo/echo-client-e2e/src/bench-score/cli.ts:89`

System One judges this a likely violation of `structured-logging-not-console` (Use the project logger, at the right level, without spam), p=0.85. The likeliest place is lines 89-100 (`const markdown = renderReport('ECHO benchmarks', report);`, location confidence 0.69). This is a single-shot classifier: confirm against the rule before acting.

Ignored: a CLI whose stdout is its product (the markdown report and GitHub `::warning::` annotations), as `composer-app/scripts/score-perf.ts` and the other CI scripts do; the structured logger would wrap it.

# WARN e7e77779-2 moon-yml-entrypoint-registration `packages/e2e/perf-harness/package.json:13`

System One judges this a likely violation of `moon-yml-entrypoint-registration` (Every package.json export/import entrypoint must be registered in the package's moon.yml), p=0.80. The likeliest place is lines 13-24 (`"author": "DXOS.org",`, location confidence 0.98). Judged with added `diff, package, siblings` context after a first pass of 0.79. This is a single-shot classifier: confirm against the rule before acting.

Ignored: perf-harness exports TypeScript source directly (no bundled entrypoints; its build only emits declarations), and its existing `.` export is not registered either — there is no entrypoint list to add `./score` to.

## Appendix

### System One pass

- model: jev-latest
- base for context: `b72c745d4912035d0622a4ab34da7b961a55af51`
- thresholds: violation ≥ 0.8; uncertain ≥ 0.15 and ≥ the rule's median across this run + 0.15 (rules with 20+ verdicts); context fetched when asked with ≥ 0.35
- verdicts: 2 violations written to fragments, 124 uncertain, 273 clean, 0 unanswered
- left for an agentic reviewer: 31 batch(es)

```text
requests: 225 (74 verdicts re-asked with context the model requested)
estimated input tokens: 1062680
billed input tokens: 1011981 (cost $0.0425)
measured chars per token: 3.15
```
