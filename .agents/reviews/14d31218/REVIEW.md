---
branch: dm/zealous-bohr-833aun
commit: 14d3121891092f1e27c4b5aa46b5e08f34b8a344
base: 4a20392c50dd8da257e4500fe01d5179d88e5134
mode: fast
createdAt: 2026-10-28T10:20:37.106Z
isFinalized: true
groups: 65
rules: [log-fire-and-forget-rejections]
reviewId: 14d31218
---

_0 error(s), 1 warning(s)._

## Index

<!-- `- <id> - unresolved|ignored|resolved - <rule> - <file:line[:col]>` -->

- 14d31218-1 - ignored - log-fire-and-forget-rejections - packages/apps/composer-app/src/workers/observability-worker.ts:61

## Issues

# WARN 14d31218-1 log-fire-and-forget-rejections `packages/apps/composer-app/src/workers/observability-worker.ts:61`

System One judges this a likely violation of `log-fire-and-forget-rejections` (A fire-and-forget promise logs its rejection, never swallows it), p=0.97. The likeliest place is lines 61-64 (`const fireFlush = (result: Promise<void>): void => {`, location confidence 0.93). This is a single-shot classifier: confirm against the rule before acting.

Ignored: `fireFlush` predates this PR, and this worker is the log sink itself, so a failed flush has no logger to report to without feeding back into the sink.

## Appendix

### System One pass

- model: jev-latest
- base for context: `4a20392c50dd8da257e4500fe01d5179d88e5134`
- thresholds: violation ≥ 0.8; uncertain ≥ 0.15 and ≥ the rule's median across this run + 0.15 (rules with 20+ verdicts); context fetched when asked with ≥ 0.35
- verdicts: 1 violations written to fragments, 60 uncertain, 72 clean, 0 unanswered
- left for an agentic reviewer: 40 batch(es)

```text
requests: 76 (36 verdicts re-asked with context the model requested)
estimated input tokens: 397142
billed input tokens: 385325 (cost $0.0162)
measured chars per token: 3.09
```
