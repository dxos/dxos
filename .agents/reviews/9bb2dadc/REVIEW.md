---
branch: claude/composer-plugin-deepseek-demo-v0t1io
commit: 9bb2dadc85d164d1c0849bb9245ead5f34c4ef59
base: dce0aace2347cf2b662e9457275833adf5bfb411
mode: fast
createdAt: 2026-09-27T14:08:58.745Z
isFinalized: true
groups: 56
rules: [effect-fn-not-hand-wrapped-gen]
reviewId: 9bb2dadc
---

_0 error(s), 1 warning(s)._

# WARN 9bb2dadc-1 effect-fn-not-hand-wrapped-gen `packages/plugins/plugin-debug/src/samples/plugin/project.ts:44`

System One judges this a likely violation of `effect-fn-not-hand-wrapped-gen` (Define Effect-returning functions with Effect.fn/fnUntraced, not a hand-wrapped Effect.gen), p=0.88. The likeliest place is lines 44-55 (`export const ProjectPhase: SampleSpace.Phase<ProjectResult, ProjectInput> = S...`, location confidence 0.96). This is a single-shot classifier: confirm against the rule before acting.
