---
branch: claude/spaces-load-failure-6d143d
commit: 3eea03906c653a62f0576e41a4ab351145c89c2a
base: b63506be5884ac6b0666595d84d0196a7493a72c
mode: fast
createdAt: 2026-09-28T13:43:06.468Z
isFinalized: true
groups: 58
rules: [deferred-callback-owns-its-context, no-casts, no-mixed-promise-effect-lifecycle, no-sleep-in-test]
reviewId: 3eea03906c6
---

_2 error(s), 3 warning(s)._

# WARN 3eea03906c6-1 no-mixed-promise-effect-lifecycle `packages/core/echo/echo-host/src/db-host/query-service.ts:1`

System One judges this a likely violation of `no-mixed-promise-effect-lifecycle` (Once an interface is Effect-based, keep its whole surface in Effect), p=0.84. This is a single-shot classifier: confirm against the rule before acting.

# WARN 3eea03906c6-2 no-sleep-in-test `packages/sdk/client-e2e/src/spaces.test.ts:65`

System One judges this a likely violation of `no-sleep-in-test` (No sleep or polling in tests), p=0.81. The likeliest place is lines 65-88 (`test('creates a space whose database opens only after a long stall', async ()...`, location confidence 0.46). This is a single-shot classifier: confirm against the rule before acting.

# ERROR 3eea03906c6-3 no-casts `packages/sdk/client-e2e/src/spaces.test.ts:449`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.97. The likeliest place is lines 449-472 (`Obj.update(hostDocument.content as any, (c: any) => {`, location confidence 0.87). This is a single-shot classifier: confirm against the rule before acting.

# ERROR 3eea03906c6-4 no-casts `packages/sdk/client/src/echo/space-proxy.ts:236`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.93. The likeliest place is lines 236-259 (`return requirePublicKey(this._data.spaceKey);`, location confidence 0.13). This is a single-shot classifier: confirm against the rule before acting.

# WARN 3eea03906c6-5 deferred-callback-owns-its-context `packages/sdk/client/src/echo/space-proxy.ts:476`

System One judges this a likely violation of `deferred-callback-owns-its-context` (A deferred callback gets its own Effect context, never inherits the caller's), p=0.82. The likeliest place is lines 476-499 (`}`, location confidence 0.37). This is a single-shot classifier: confirm against the rule before acting.
