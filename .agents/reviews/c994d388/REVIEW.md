---
branch: dm/jolly-ptolemy-oqjied
commit: c994d388a434fac2f285978bb54a5de959c16151
base: b406c2c49590d1cd070ba4add683bd41b019df78
mode: fast
createdAt: 2026-10-19T06:51:32.100Z
isFinalized: true
groups: 81
rules: [effect-fn-not-hand-wrapped-gen]
reviewId: c994d388
---

_0 error(s), 1 warning(s)._

## Index

<!-- `- <id> - unresolved|ignored|resolved - <rule> - <file:line[:col]>` -->

- c994d388-1 - resolved - effect-fn-not-hand-wrapped-gen - packages/plugins/plugin-magazine/src/samples/reading-room/partial.ts:34

## Issues

# WARN c994d388-1 effect-fn-not-hand-wrapped-gen `packages/plugins/plugin-magazine/src/samples/reading-room/partial.ts:34`

System One judges this a likely violation of `effect-fn-not-hand-wrapped-gen` (Define Effect-returning functions with Effect.fn/fnUntraced, not a hand-wrapped Effect.gen), p=0.82. The likeliest place is lines 34-45 (`Effect.gen(function* () {`, location confidence 0.86). This is a single-shot classifier: confirm against the rule before acting.

## Appendix

### System One pass

- model: jev-latest
- base for context: `b406c2c49590d1cd070ba4add683bd41b019df78`
- thresholds: violation ≥ 0.8; uncertain ≥ 0.15 and ≥ the rule's median across this run + 0.15 (rules with 20+ verdicts); context fetched when asked with ≥ 0.35
- verdicts: 1 violations written to fragments, 115 uncertain, 218 clean, 0 unanswered
- left for an agentic reviewer: 52 batch(es)

```text
requests: 185 (87 verdicts re-asked with context the model requested)
estimated input tokens: 1053824
billed input tokens: 990408 (cost $0.0416)
measured chars per token: 3.19
```
