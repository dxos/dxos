---
branch: dm/fervent-wright-nm7pc1
commit: bb926060446e3b6ac0b96bf6ebaf0a30f11024cb
base: 0f8a77a9930def296c5b422a9dd8c54653b41715
mode: fast
createdAt: 2026-10-04T18:24:30.305Z
isFinalized: true
groups: 57
rules: [diff-scoped-to-pr-purpose, effect-fn-not-hand-wrapped-gen, no-echo-internal-in-sdk]
reviewId: bb926060
---

_0 error(s), 3 warning(s)._

## Index

<!-- `- <id> - unresolved|ignored|resolved - <rule> - <file:line[:col]>` -->

- bb926060-1 - ignored - diff-scoped-to-pr-purpose - packages/sdk/types/src/types/Task.test.ts:7
- bb926060-2 - ignored - no-echo-internal-in-sdk - packages/sdk/types/src/types/Task.ts:1
- bb926060-3 - ignored - effect-fn-not-hand-wrapped-gen - packages/sdk/types/src/types/TaskSet.ts:175

## Issues

# WARN bb926060-1 diff-scoped-to-pr-purpose `packages/sdk/types/src/types/Task.test.ts:7`

System One judges this a likely violation of `diff-scoped-to-pr-purpose` (Keep a diff scoped to what the PR says it does; drop unrelated or accidental hunks), p=0.83. This is a single-shot classifier: confirm against the rule before acting.

# WARN bb926060-2 no-echo-internal-in-sdk `packages/sdk/types/src/types/Task.ts:1`

System One judges this a likely violation of `no-echo-internal-in-sdk` (SDK and app code uses the public ECHO API), p=0.80. The likeliest place is lines 1-24 (`import * as Duration from 'effect/Duration';`, location confidence 0.89). This is a single-shot classifier: confirm against the rule before acting.

# WARN bb926060-3 effect-fn-not-hand-wrapped-gen `packages/sdk/types/src/types/TaskSet.ts:175`

System One judges this a likely violation of `effect-fn-not-hand-wrapped-gen` (Define Effect-returning functions with Effect.fn/fnUntraced, not a hand-wrapped Effect.gen), p=0.80. The likeliest place is lines 175-186 (`export const findTaskSet = (task: Task.Task): Effect.Effect<TaskSet | undefin...`, location confidence 0.73). This is a single-shot classifier: confirm against the rule before acting.

## Appendix

### System One pass

- model: jev-latest
- base for context: `0f8a77a9930def296c5b422a9dd8c54653b41715`
- thresholds: violation ≥ 0.8; uncertain ≥ 0.15 and ≥ the rule's median across this run + 0.15 (rules with 20+ verdicts); context fetched when asked with ≥ 0.35
- verdicts: 3 violations written to fragments, 90 uncertain, 39 clean, 0 unanswered
- left for an agentic reviewer: 44 batch(es)

```text
requests: 87 (57 verdicts re-asked with context the model requested)
estimated input tokens: 1539391
billed input tokens: 1529622 (cost $0.0642)
measured chars per token: 3.02
```
