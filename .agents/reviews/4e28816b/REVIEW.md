---
branch: dm/task-create-cmd-enter
commit: 4e28816bfcd12e479432611d7c37377bfae71d50
base: 8ebe8d6604d41f09f4b287a98544efa7012141cb
mode: fast
createdAt: 2026-10-04T19:12:19.157Z
isFinalized: true
groups: 58
rules: [effect-fn-not-hand-wrapped-gen]
reviewId: 4e28816b
---

_0 error(s), 1 warning(s)._

## Index

<!-- `- <id> - unresolved|ignored|resolved - <rule> - <file:line[:col]>` -->

- 4e28816b-1 - ignored - effect-fn-not-hand-wrapped-gen - packages/plugins/plugin-space/src/capabilities/create-object.ts:118

## Issues

# WARN 4e28816b-1 effect-fn-not-hand-wrapped-gen `packages/plugins/plugin-space/src/capabilities/create-object.ts:118`

System One judges this a likely violation of `effect-fn-not-hand-wrapped-gen` (Define Effect-returning functions with Effect.fn/fnUntraced, not a hand-wrapped Effect.gen), p=0.91. The likeliest place is lines 118-129 (`createObject: (props, options) =>`, location confidence 0.52). This is a single-shot classifier: confirm against the rule before acting.

## Appendix

### System One pass

- model: jev-latest
- base for context: `8ebe8d6604d41f09f4b287a98544efa7012141cb`
- thresholds: violation ≥ 0.8; uncertain ≥ 0.15 and ≥ the rule's median across this run + 0.15 (rules with 20+ verdicts); context fetched when asked with ≥ 0.35
- verdicts: 1 violations written to fragments, 58 uncertain, 86 clean, 0 unanswered
- left for an agentic reviewer: 35 batch(es)

```text
requests: 87 (35 verdicts re-asked with context the model requested)
estimated input tokens: 434407
billed input tokens: 396412 (cost $0.0166)
measured chars per token: 3.29
```
