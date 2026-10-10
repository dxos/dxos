---
branch: dm/vibrant-gates-u8vy5m
commit: 28e90b5fb12300c9c7cadc36f5f85c090124dbff
base: a26b4836107322507989847fb873f3f7a4ea34d2
mode: fast
createdAt: 2026-10-02T11:21:45.999Z
isFinalized: true
groups: 50
rules: [error-messages-carry-context, structured-logging-not-console]
reviewId: 28e90b5f
---

_0 error(s), 2 warning(s)._

## Index

<!-- `- <id> - unresolved|ignored|resolved - <rule> - <file:line[:col]>` -->

- 28e90b5f-1 - ignored - structured-logging-not-console - packages/e2e/perf-harness/src/score/run.ts:77
- 28e90b5f-2 - resolved - error-messages-carry-context - packages/e2e/perf-harness/src/score/stages.ts:19

## Issues

# WARN 28e90b5f-1 structured-logging-not-console `packages/e2e/perf-harness/src/score/run.ts:77`

System One judges this a likely violation of `structured-logging-not-console` (Use the project logger, at the right level, without spam), p=0.91. The likeliest place is lines 77-88 (`console.log(`::warning::metric "${id}" has no budget in ${budgetsFile}`);`, location confidence 0.91). This is a single-shot classifier: confirm against the rule before acting.

# WARN 28e90b5f-2 error-messages-carry-context `packages/e2e/perf-harness/src/score/stages.ts:19`

System One judges this a likely violation of `error-messages-carry-context` (An error carries the identifier that lets it be traced), p=0.81. The likeliest place is lines 19-30 (`export const parseStageEvent = (json: unknown): StageEvent => {`, location confidence 0.97). This is a single-shot classifier: confirm against the rule before acting.

## Appendix

### System One pass

- model: jev-latest
- base for context: `a26b4836107322507989847fb873f3f7a4ea34d2`
- thresholds: violation ≥ 0.8; uncertain ≥ 0.15 and ≥ the rule's median across this run + 0.15 (rules with 20+ verdicts); context fetched when asked with ≥ 0.35
- verdicts: 2 violations written to fragments, 60 uncertain, 158 clean, 0 unanswered
- left for an agentic reviewer: 32 batch(es)

```text
requests: 116 (33 verdicts re-asked with context the model requested)
estimated input tokens: 574915
billed input tokens: 547506 (cost $0.0230)
measured chars per token: 3.15
```
