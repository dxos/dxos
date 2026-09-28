---
branch: claude/sync-performance-debug-i1xelq
commit: f41234214ae9f61384e445bbf18b175db3a33d3a
base: 28bc6a323fc14c43ef424a85b64c32d3776d5ff6
mode: fast
createdAt: 2026-09-28T16:43:25.067Z
isFinalized: true
groups: 57
rules: [errors-extend-base-error, no-casts, no-mixed-promise-effect-lifecycle, no-sleep-in-test, use-context-scoped-cancellation]
reviewId: f4123421
---

_5 error(s), 4 warning(s)._

# WARN f4123421-1 no-mixed-promise-effect-lifecycle `packages/core/echo/echo-host/src/db-host/space-state-manager.test.ts:75`

System One judges this a likely violation of `no-mixed-promise-effect-lifecycle` (Once an interface is Effect-based, keep its whole surface in Effect), p=0.83. The likeliest place is lines 75-86 (`await manager.close();`, location confidence 0.28). Judged with added `imports, test` context after a first pass of 0.62. This is a single-shot classifier: confirm against the rule before acting.

# ERROR f4123421-2 no-casts `packages/core/echo/echo-host/src/db-host/space-state-manager.test.ts:243`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.92. The likeliest place is lines 243-254 (`const root = await host.loadDoc<SpaceRoot>(Context.default(), spaceRootUrl);`, location confidence 0.70). This is a single-shot classifier: confirm against the rule before acting.

# WARN f4123421-3 no-sleep-in-test `packages/core/echo/echo-host/src/db-host/space-state-manager.test.ts:411`

System One judges this a likely violation of `no-sleep-in-test` (No sleep or polling in tests), p=0.95. The likeliest place is lines 411-422 (`});`, location confidence 0.80). This is a single-shot classifier: confirm against the rule before acting.

# WARN f4123421-4 no-mixed-promise-effect-lifecycle `packages/core/echo/echo-host/src/db-host/space-state-manager.ts:165`

System One judges this a likely violation of `no-mixed-promise-effect-lifecycle` (Once an interface is Effect-based, keep its whole surface in Effect), p=0.89. The likeliest place is lines 165-176 (`async removeSpace(spaceId: SpaceId): Promise<void> {`, location confidence 0.71). This is a single-shot classifier: confirm against the rule before acting.

# ERROR f4123421-5 no-casts `packages/core/echo/echo-host/src/edge/echo-edge-subduction-replicator.test.ts:224`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.96. The likeliest place is lines 224-235 (`edgeHttpClient: {} as EdgeHttpClient,`, location confidence 0.46). This is a single-shot classifier: confirm against the rule before acting.

# ERROR f4123421-6 no-casts `packages/core/echo/echo-host/src/edge/echo-edge-subduction-replicator.ts:500`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.90. The likeliest place is lines 500-523 (`payload = cbor.decode(message.payload!.value) as SubductionProtocolMessageEnv...`, location confidence 0.96). This is a single-shot classifier: confirm against the rule before acting.

# WARN f4123421-7 use-context-scoped-cancellation `packages/core/echo/echo-host/src/edge/echo-edge-subduction-replicator.ts:716`

System One judges this a likely violation of `use-context-scoped-cancellation` (Schedule timeouts through the ctx-aware scheduler), p=0.88. The likeliest place is lines 716-739 (`}, SUBDUCTION_BATCH_MAX_DELAY_MS);`, location confidence 0.85). This is a single-shot classifier: confirm against the rule before acting.

# ERROR f4123421-8 errors-extend-base-error `packages/core/mesh/edge-client/src/edge-ws-muxer.ts:375`

System One judges this a likely violation of `errors-extend-base-error` (Error classes are defined with `BaseError.extend`, never by subclassing `Error` or a tagged-error factory), p=0.80. The likeliest place is lines 375-388 (`export class SegmentedMessageLimitError extends Error {`, location confidence 0.99). This is a single-shot classifier: confirm against the rule before acting.

# ERROR f4123421-9 no-casts `packages/core/mesh/edge-client/src/testing/test-utils.ts:37`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.97. The likeliest place is lines 37-48 (`const sendResponseMessage = createResponseSender(() => connection!.muxer);`, location confidence 0.78). This is a single-shot classifier: confirm against the rule before acting.
