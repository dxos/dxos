---
branch: dm/vibrant-gates-u8vy5m
commit: 0a4bae2193286440226008e8d4c048a6875e4bb2
base: 28e90b5fb12300c9c7cadc36f5f85c090124dbff
mode: fast
createdAt: 2026-10-02T12:39:17.008Z
isFinalized: true
groups: 50
rules: [structured-logging-not-console]
reviewId: 0a4bae21
---

_0 error(s), 1 warning(s)._

## Index

<!-- `- <id> - unresolved|ignored|resolved - <rule> - <file:line[:col]>` -->

- 0a4bae21-1 - ignored - structured-logging-not-console - packages/e2e/perf-harness/src/score/run.ts:77

## Issues

# WARN 0a4bae21-1 structured-logging-not-console `packages/e2e/perf-harness/src/score/run.ts:77`

System One judges this a likely violation of `structured-logging-not-console` (Use the project logger, at the right level, without spam), p=0.90. The likeliest place is lines 77-88 (`const report = scoreMeasurements(toMeasurements(events), budgets, { scoreMiss...`, location confidence 0.92). This is a single-shot classifier: confirm against the rule before acting.

## Appendix

### System One pass

- model: jev-latest
- base for context: `28e90b5fb12300c9c7cadc36f5f85c090124dbff`
- thresholds: violation ≥ 0.8; uncertain ≥ 0.15 and ≥ the rule's median across this run + 0.15 (rules with 20+ verdicts); context fetched when asked with ≥ 0.35
- verdicts: 1 violations written to fragments, 38 uncertain, 71 clean, 0 unanswered
- left for an agentic reviewer: 30 batch(es)

```text
requests: 64 (20 verdicts re-asked with context the model requested)
estimated input tokens: 321841
billed input tokens: 314368 (cost $0.0132)
measured chars per token: 3.07
```
