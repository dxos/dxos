---
branch: claude/charming-sagan-v3y2u1
commit: e2774ad2aa7abf3b4402de53cbace99b4545e93c
base: 042fcd3205b5381311e46d07aa87cf67e80fe7f4
mode: fast
createdAt: 2026-09-28T19:39:04.817Z
isFinalized: true
groups: 53
rules: [effect-fn-not-hand-wrapped-gen, no-casts]
reviewId: e2774ad2
---

_1 error(s), 1 warning(s)._

# WARN e2774ad2-1 effect-fn-not-hand-wrapped-gen `packages/core/echo/index-core/src/indexes/chunked-reads.test.ts:112`

System One judges this a likely violation of `effect-fn-not-hand-wrapped-gen` (Define Effect-returning functions with Effect.fn/fnUntraced, not a hand-wrapped Effect.gen), p=0.90. The likeliest place is lines 112-123 (`const runWithLimit = <A, E, R>(read: Effect.Effect<A, E, R>, limit: number) =>`, location confidence 0.93). This is a single-shot classifier: confirm against the rule before acting.

# ERROR e2774ad2-2 no-casts `packages/core/echo/index-core/src/indexes/object-snapshot-index.test.ts:61`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.98. The likeliest place is lines 61-72 (`const recordIds = objects.map((o) => o.recordId!);`, location confidence 0.90). This is a single-shot classifier: confirm against the rule before acting.
