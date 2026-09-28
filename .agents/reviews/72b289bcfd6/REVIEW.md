---
branch: claude/app-graph-icon-colours-7a1f9f
commit: 72b289bcfd6aa99c4acdb326a96a659f38ac1592
base: b63506be5884ac6b0666595d84d0196a7493a72c
mode: fast
createdAt: 2026-09-28T14:07:16.130Z
isFinalized: true
groups: 46
rules: [effect-fn-not-hand-wrapped-gen]
reviewId: 72b289bcfd6
---

_0 error(s), 1 warning(s)._

# WARN 72b289bcfd6-1 effect-fn-not-hand-wrapped-gen `packages/plugins/plugin-projects/src/capabilities/app-graph-builder.ts:107`

System One judges this a likely violation of `effect-fn-not-hand-wrapped-gen` (Define Effect-returning functions with Effect.fn/fnUntraced, not a hand-wrapped Effect.gen), p=0.83. The likeliest place is lines 107-118 (`AppGraphNode.makeAction({`, location confidence 0.67). This is a single-shot classifier: confirm against the rule before acting.
