---
branch: claude/sync-performance-debug-i1xelq
commit: ff6a268f306953a8087dbf6dd8d474e85a5d5200
base: 5662bbc3b0d2315aff7b697a0de1611f5f04fee7
mode: fast
createdAt: 2026-09-26T20:40:35.911Z
isFinalized: true
groups: 57
rules: [errors-extend-base-error, no-casts, no-mixed-promise-effect-lifecycle, no-sleep-in-test, use-context-scoped-cancellation]
reviewId: ff6a268f
---

_5 error(s), 4 warning(s)._

# WARN ff6a268f-1 no-mixed-promise-effect-lifecycle `packages/core/echo/echo-host/src/db-host/space-state-manager.test.ts:75`

System One judges this a likely violation of `no-mixed-promise-effect-lifecycle` (Once an interface is Effect-based, keep its whole surface in Effect), p=0.83. The likeliest place is lines 75-86 (`await manager.close();`, location confidence 0.21). Judged with added `imports, test` context after a first pass of 0.61. This is a single-shot classifier: confirm against the rule before acting.

# ERROR ff6a268f-2 no-casts `packages/core/echo/echo-host/src/db-host/space-state-manager.test.ts:243`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.90. The likeliest place is lines 243-254 (`const root = await host.loadDoc<SpaceRoot>(Context.default(), spaceRootUrl);`, location confidence 0.70). This is a single-shot classifier: confirm against the rule before acting.

# WARN ff6a268f-3 no-sleep-in-test `packages/core/echo/echo-host/src/db-host/space-state-manager.test.ts:411`

System One judges this a likely violation of `no-sleep-in-test` (No sleep or polling in tests), p=0.95. The likeliest place is lines 411-422 (`});`, location confidence 0.82). This is a single-shot classifier: confirm against the rule before acting.

# WARN ff6a268f-4 no-mixed-promise-effect-lifecycle `packages/core/echo/echo-host/src/db-host/space-state-manager.ts:165`

System One judges this a likely violation of `no-mixed-promise-effect-lifecycle` (Once an interface is Effect-based, keep its whole surface in Effect), p=0.83. The likeliest place is lines 165-176 (`async removeSpace(spaceId: SpaceId): Promise<void> {`, location confidence 0.74). This is a single-shot classifier: confirm against the rule before acting.

# ERROR ff6a268f-5 no-casts `packages/core/echo/echo-host/src/edge/echo-edge-subduction-replicator.test.ts:224`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.97. The likeliest place is lines 224-235 (`edgeHttpClient: {} as EdgeHttpClient,`, location confidence 0.50). This is a single-shot classifier: confirm against the rule before acting.

# ERROR ff6a268f-6 no-casts `packages/core/echo/echo-host/src/edge/echo-edge-subduction-replicator.ts:500`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.90. The likeliest place is lines 500-523 (`payload = cbor.decode(message.payload!.value) as SubductionProtocolMessageEnv...`, location confidence 0.97). This is a single-shot classifier: confirm against the rule before acting.

# WARN ff6a268f-7 use-context-scoped-cancellation `packages/core/echo/echo-host/src/edge/echo-edge-subduction-replicator.ts:716`

System One judges this a likely violation of `use-context-scoped-cancellation` (Schedule timeouts through the ctx-aware scheduler), p=0.88. The likeliest place is lines 716-739 (`}, SUBDUCTION_BATCH_MAX_DELAY_MS);`, location confidence 0.91). This is a single-shot classifier: confirm against the rule before acting.

# ERROR ff6a268f-8 errors-extend-base-error `packages/core/mesh/edge-client/src/edge-ws-muxer.ts:342`

System One judges this a likely violation of `errors-extend-base-error` (Error classes are defined with `BaseError.extend`, never by subclassing `Error` or a tagged-error factory), p=0.97. The likeliest place is lines 342-355 (`export class SegmentedMessageLimitError extends Error {`, location confidence 0.87). This is a single-shot classifier: confirm against the rule before acting.

# ERROR ff6a268f-9 no-casts `packages/core/mesh/edge-client/src/testing/test-utils.ts:37`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.97. The likeliest place is lines 37-48 (`const sendResponseMessage = createResponseSender(() => connection!.muxer);`, location confidence 0.76). This is a single-shot classifier: confirm against the rule before acting.
