---
branch: dm/dazzling-goldberg-fdw85c
commit: e2a575396e0520520af1b41e151656e9ef8ece27
base: 7ea1e7d9026ec49f8c2440d0dbf1f2587d0bf3e4
mode: fast
createdAt: 2026-10-01T06:44:37.263Z
isFinalized: true
groups: 92
rules: [effect-fn-not-hand-wrapped-gen]
reviewId: e2a57539
---

_0 error(s), 1 warning(s)._

## Index

<!-- `- <id> - unresolved|ignored|resolved - <rule> - <file:line[:col]>` -->

- e2a57539-1 - resolved - effect-fn-not-hand-wrapped-gen - packages/common/permission/src/Grant.ts:102

## Issues

# WARN e2a57539-1 effect-fn-not-hand-wrapped-gen `packages/common/permission/src/Grant.ts:102`

System One judges this a likely violation of `effect-fn-not-hand-wrapped-gen` (Define Effect-returning functions with Effect.fn/fnUntraced, not a hand-wrapped Effect.gen), p=0.87. The likeliest place is lines 102-118 (`export const make = ({ meta, ...payload }: MakeOptions): Effect.Effect<Grant> =>`, location confidence 0.81). This is a single-shot classifier: confirm against the rule before acting.

## Appendix

### System One pass

- model: jev-latest
- base for context: `7ea1e7d9026ec49f8c2440d0dbf1f2587d0bf3e4`
- thresholds: violation ≥ 0.8; uncertain ≥ 0.15 and ≥ the rule's median across this run + 0.15 (rules with 20+ verdicts); context fetched when asked with ≥ 0.35
- verdicts: 1 violations written to fragments, 192 uncertain, 374 clean, 0 unanswered
- left for an agentic reviewer: 34 batch(es)

```text
requests: 329 (120 verdicts re-asked with context the model requested)
estimated input tokens: 1879802
billed input tokens: 1738580 (cost $0.0730)
measured chars per token: 3.24
```
