---
branch: dm/zen-hawking-92843m
commit: 73c44a16dafde74103054776be09c91a37e64856
base: 6ec1c5f931a013a0364dd96c98238b72cdd03deb
mode: fast
createdAt: 2026-09-30T05:11:04.166Z
isFinalized: true
groups: 51
rules: [effect-fn-not-hand-wrapped-gen]
reviewId: 73c44a16
---

_0 error(s), 1 warning(s)._

# WARN 73c44a16-1 effect-fn-not-hand-wrapped-gen `packages/sdk/app-framework/src/worker/testing/echo-worker-plugin.ts:35`

System One judges this a likely violation of `effect-fn-not-hand-wrapped-gen` (Define Effect-returning functions with Effect.fn/fnUntraced, not a hand-wrapped Effect.gen), p=0.83. The likeliest place is lines 35-46 (`);`, location confidence 0.88). This is a single-shot classifier: confirm against the rule before acting.
