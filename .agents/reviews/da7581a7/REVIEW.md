---
branch: HEAD
commit: da7581a7050ad2ec0c7a27ed884e817ebf264232
base: 212361b6c03c7a94b39007bd24b02328f0e66f30
mode: fast
createdAt: 2026-10-02T10:08:18.032Z
isFinalized: true
groups: 43
rules: [structured-logging-not-console]
reviewId: da7581a7
---

_0 error(s), 1 warning(s)._

## Index

<!-- `- <id> - unresolved|ignored|resolved - <rule> - <file:line[:col]>` -->

- da7581a7-1 - ignored - structured-logging-not-console - packages/core/echo/echo-client-e2e/src/bench-score/cli.ts:90

## Issues

# WARN da7581a7-1 structured-logging-not-console `packages/core/echo/echo-client-e2e/src/bench-score/cli.ts:90`

System One judges this a likely violation of `structured-logging-not-console` (Use the project logger, at the right level, without spam), p=0.85. The likeliest place is lines 90-101 (`const markdown = renderReport('ECHO benchmarks', report);`, location confidence 0.39). This is a single-shot classifier: confirm against the rule before acting.

Ignored: pre-existing and out of this diff's scope — the CLI's stdout is its product (the markdown report and GitHub `::warning::` annotations), as in e7e77779-1; this change only touches the `calibrate` branch.

## Appendix

### System One pass

- model: jev-latest
- base for context: `212361b6c03c7a94b39007bd24b02328f0e66f30`
- thresholds: violation ≥ 0.8; uncertain ≥ 0.15 and ≥ the rule's median across this run + 0.15 (rules with 20+ verdicts); context fetched when asked with ≥ 0.35
- verdicts: 1 violations written to fragments, 15 uncertain, 22 clean, 0 unanswered
- left for an agentic reviewer: 20 batch(es)

```text
requests: 23 (10 verdicts re-asked with context the model requested)
estimated input tokens: 120935
billed input tokens: 117321 (cost $0.0049)
measured chars per token: 3.09
```
