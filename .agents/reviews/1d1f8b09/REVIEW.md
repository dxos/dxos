---
branch: worktree-perf-work-counters
commit: 1d1f8b095f9d585ca4ee5cba830804bc3ec52777
base: bdb798472a4e6b7215bf09c3a27c547e6a928cf9
mode: fast
createdAt: 2026-10-06T05:18:09.211Z
isFinalized: true
groups: 47
rules: [namespace-brand-key-prefixing, structured-logging-not-console]
reviewId: 1d1f8b09
---

_0 error(s), 2 warning(s)._

## Index

<!-- `- <id> - unresolved|ignored|resolved - <rule> - <file:line[:col]>` -->

- 1d1f8b09-1 - ignored - namespace-brand-key-prefixing - packages/core/compute/assistant-e2e/src/playwright/perf/suite.ts:1
- 1d1f8b09-2 - ignored - structured-logging-not-console - packages/e2e/perf-harness/src/score/run.ts:151

## Issues

# WARN 1d1f8b09-1 namespace-brand-key-prefixing `packages/core/compute/assistant-e2e/src/playwright/perf/suite.ts:1`

System One judges this a likely violation of `namespace-brand-key-prefixing` (Namespace a brand or annotation key string with its owning module's path), p=0.81. The likeliest place is lines 1-13 (`import { type ExtraScale } from '@dxos/perf-harness/score';`, location confidence 1.00). Judged with added `importers` context after a first pass of 0.73. This is a single-shot classifier: confirm against the rule before acting.

# WARN 1d1f8b09-2 structured-logging-not-console `packages/e2e/perf-harness/src/score/run.ts:151`

System One judges this a likely violation of `structured-logging-not-console` (Use the project logger, at the right level, without spam), p=0.90. The likeliest place is lines 151-162 (`({ id }) => budgets[id] !== undefined || !isWorkId(extraScales, id),`, location confidence 0.86). This is a single-shot classifier: confirm against the rule before acting.

## Appendix

### System One pass

- model: jev-latest
- base for context: `bdb798472a4e6b7215bf09c3a27c547e6a928cf9`
- thresholds: violation ≥ 0.8; uncertain ≥ 0.15 and ≥ the rule's median across this run + 0.15 (rules with 20+ verdicts); context fetched when asked with ≥ 0.35
- verdicts: 2 violations written to fragments, 90 uncertain, 262 clean, 0 unanswered
- left for an agentic reviewer: 29 batch(es)

```text
requests: 179 (48 verdicts re-asked with context the model requested)
estimated input tokens: 925693
billed input tokens: 888621 (cost $0.0373)
measured chars per token: 3.13
```
