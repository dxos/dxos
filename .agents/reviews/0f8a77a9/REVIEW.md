---
branch: dm/fervent-wright-nm7pc1
commit: 0f8a77a9930def296c5b422a9dd8c54653b41715
base: 9da3f1d5cd22a06fae772312b3be67c4bc0f5d40
mode: fast
createdAt: 2026-09-28T12:30:15.534Z
isFinalized: true
groups: 57
rules: [effect-fn-not-hand-wrapped-gen]
reviewId: 0f8a77a9
---

_0 error(s), 2 warning(s)._

# WARN 0f8a77a9-1 effect-fn-not-hand-wrapped-gen `packages/sdk/types/src/types/Task.ts:1098`

System One judges this a likely violation of `effect-fn-not-hand-wrapped-gen` (Define Effect-returning functions with Effect.fn/fnUntraced, not a hand-wrapped Effect.gen), p=0.89. The likeliest place is lines 1098-1121 (`export const artifactTarget = (`, location confidence 0.38). This is a single-shot classifier: confirm against the rule before acting.

# WARN 0f8a77a9-2 effect-fn-not-hand-wrapped-gen `packages/sdk/types/src/types/TaskSet.ts:175`

System One judges this a likely violation of `effect-fn-not-hand-wrapped-gen` (Define Effect-returning functions with Effect.fn/fnUntraced, not a hand-wrapped Effect.gen), p=0.80. The likeliest place is lines 175-186 (`export const findTaskSet = (task: Task.Task): Effect.Effect<TaskSet | undefin...`, location confidence 0.68). This is a single-shot classifier: confirm against the rule before acting.
