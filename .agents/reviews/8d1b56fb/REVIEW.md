---
branch: dm/vibrant-gates-u8vy5m
commit: 8d1b56fb0e767bc1f0f341b47083fa38dc52e937
base: 53d3f275a74d9d7bf57fb580eaed8fb138c05ae0
mode: fast
createdAt: 2026-10-02T13:09:41.062Z
isFinalized: true
groups: 43
rules: [no-casts]
reviewId: 8d1b56fb
---

_1 error(s), 0 warning(s)._

## Index

<!-- `- <id> - unresolved|ignored|resolved - <rule> - <file:line[:col]>` -->

- 8d1b56fb-1 - resolved - no-casts - packages/e2e/perf-harness/src/cdp.ts:17

## Issues

# ERROR 8d1b56fb-1 no-casts `packages/e2e/perf-harness/src/cdp.ts:17`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.93. The likeliest place is lines 17-28 (`export class Cdp {`, location confidence 0.71). This is a single-shot classifier: confirm against the rule before acting.

## Appendix

### System One pass

- model: jev-latest
- base for context: `53d3f275a74d9d7bf57fb580eaed8fb138c05ae0`
- thresholds: violation ≥ 0.8; uncertain ≥ 0.15 and ≥ the rule's median across this run + 0.15 (rules with 20+ verdicts); context fetched when asked with ≥ 0.35
- verdicts: 1 violations written to fragments, 20 uncertain, 17 clean, 0 unanswered
- left for an agentic reviewer: 25 batch(es)

```text
requests: 24 (9 verdicts re-asked with context the model requested)
estimated input tokens: 155091
billed input tokens: 150724 (cost $0.0063)
measured chars per token: 3.09
```
