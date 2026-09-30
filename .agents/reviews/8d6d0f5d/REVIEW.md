---
branch: dm/eager-sagan-z0g6bk
commit: 8d6d0f5d942c34397cfe1ad7192a96bca0e64591
base: 8c5219f507b8217466f11c48b0a7b599e19661f7
mode: fast
createdAt: 2026-09-27T15:10:12.776Z
isFinalized: true
groups: 61
rules: [effect-fn-not-hand-wrapped-gen, no-casts]
reviewId: 8d6d0f5d
---

_2 error(s), 1 warning(s)._

# ERROR 8d6d0f5d-1 no-casts `packages/sdk/app-framework/src/core/capability.ts:403`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.96. The likeliest place is lines 403-422 (`[ContributionTypeId]: capability as unknown as IdentifierOf<C>,`, location confidence 0.59). This is a single-shot classifier: confirm against the rule before acting.

# WARN 8d6d0f5d-2 effect-fn-not-hand-wrapped-gen `packages/sdk/app-framework/src/core/capability.ts:551`

System One judges this a likely violation of `effect-fn-not-hand-wrapped-gen` (Define Effect-returning functions with Effect.fn/fnUntraced, not a hand-wrapped Effect.gen), p=0.80. The likeliest place is lines 551-574 (`export const lazyModule = <`, location confidence 0.90). This is a single-shot classifier: confirm against the rule before acting.

# ERROR 8d6d0f5d-3 no-casts `packages/sdk/app-framework/src/plugin-cli/generate.ts:153`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.96. The likeliest place is lines 153-164 (`const available = localCache.get(member.sourceFile)!;`, location confidence 0.82). This is a single-shot classifier: confirm against the rule before acting.
