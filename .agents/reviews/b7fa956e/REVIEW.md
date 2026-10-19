---
branch: dm/gifted-brahmagupta-c2ejou
commit: b7fa956edbb52e353709577790b6025c1dcfb4e6
base: 9d979541835a4b6256d588d4a3e18e579959377f
mode: fast
createdAt: 2026-10-07T07:25:51.188Z
isFinalized: true
groups: 53
rules: [effect-fn-not-hand-wrapped-gen, test-real-scenario-not-narrower-proxy]
reviewId: b7fa956e
---

_0 error(s), 2 warning(s)._

## Index

<!-- `- <id> - unresolved|ignored|resolved - <rule> - <file:line[:col]>` -->

- b7fa956e-1 - ignored - test-real-scenario-not-narrower-proxy - packages/plugins/plugin-agent/src/operations/triggers.test.ts:235
- b7fa956e-2 - ignored - effect-fn-not-hand-wrapped-gen - packages/plugins/plugin-agent/src/operations/triggers.test.ts:566

## Issues

# WARN b7fa956e-1 test-real-scenario-not-narrower-proxy `packages/plugins/plugin-agent/src/operations/triggers.test.ts:235`

System One judges this a likely violation of `test-real-scenario-not-narrower-proxy` (A test claiming end-to-end coverage must drive the real production path), p=0.80. The likeliest place is lines 235-258 (`}`, location confidence 0.33). Judged with added `imports, test` context after a first pass of 0.78. This is a single-shot classifier: confirm against the rule before acting.

# WARN b7fa956e-2 effect-fn-not-hand-wrapped-gen `packages/plugins/plugin-agent/src/operations/triggers.test.ts:566`

System One judges this a likely violation of `effect-fn-not-hand-wrapped-gen` (Define Effect-returning functions with Effect.fn/fnUntraced, not a hand-wrapped Effect.gen), p=0.86. The likeliest place is lines 566-582 (`}),`, location confidence 0.91). This is a single-shot classifier: confirm against the rule before acting.

## Appendix

### Dispositions

- b7fa956e-1 — ignored: lines 235-258 are the existing end-to-end scenario, unchanged by this PR (its diff in this file only renames `fireTriggers` to `pushFacts` and the matcher import).
- b7fa956e-2 — ignored: lines 562-568 are the existing test layer setup (`AssistantTestLayer` options), unchanged by this PR and not a hand-wrapped `Effect.gen`.

### System One pass

- model: jev-latest
- base for context: `9d979541835a4b6256d588d4a3e18e579959377f`
- thresholds: violation ≥ 0.8; uncertain ≥ 0.15 and ≥ the rule's median across this run + 0.15 (rules with 20+ verdicts); context fetched when asked with ≥ 0.35
- verdicts: 2 violations written to fragments, 217 uncertain, 188 clean, 0 unanswered
- left for an agentic reviewer: 45 batch(es)

```text
requests: 271 (159 verdicts re-asked with context the model requested)
estimated input tokens: 1616533
billed input tokens: 1520009 (cost $0.0638)
measured chars per token: 3.19
```
