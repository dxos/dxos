---
branch: dm/zen-gates-2kzo29
commit: b070c4dd733534cf2eccb46771867dc7489c362a
base: e1d098457349080fa832b6b0356c894aa6fbf209
mode: fast
createdAt: 2026-10-09T04:00:16.840Z
isFinalized: true
groups: 54
rules: [effect-fn-not-hand-wrapped-gen]
reviewId: b070c4dd
---

_0 error(s), 1 warning(s)._

## Index

<!-- `- <id> - unresolved|ignored|resolved - <rule> - <file:line[:col]>` -->

- b070c4dd-1 - resolved - effect-fn-not-hand-wrapped-gen - packages/plugins/plugin-github/src/operations/refresh.ts:33

## Issues

# WARN b070c4dd-1 effect-fn-not-hand-wrapped-gen `packages/plugins/plugin-github/src/operations/refresh.ts:33`

System One judges this a likely violation of `effect-fn-not-hand-wrapped-gen` (Define Effect-returning functions with Effect.fn/fnUntraced, not a hand-wrapped Effect.gen), p=0.88. The likeliest place is lines 33-44 (`export const refreshPullRequest = (`, location confidence 0.71). This is a single-shot classifier: confirm against the rule before acting.

## Appendix

### System One pass

- model: jev-latest
- base for context: `e1d098457349080fa832b6b0356c894aa6fbf209`
- thresholds: violation ≥ 0.8; uncertain ≥ 0.15 and ≥ the rule's median across this run + 0.15 (rules with 20+ verdicts); context fetched when asked with ≥ 0.35
- verdicts: 1 violations written to fragments, 102 uncertain, 161 clean, 0 unanswered
- left for an agentic reviewer: 38 batch(es)

```text
requests: 147 (72 verdicts re-asked with context the model requested)
estimated input tokens: 797155
billed input tokens: 733644 (cost $0.0308)
measured chars per token: 3.26
```
