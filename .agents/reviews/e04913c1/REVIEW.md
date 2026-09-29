---
branch: claude/sync-performance-debug-i1xelq
commit: e04913c152e9c91f7cc2091779948c60dc5e7e51
base: dc3302bcfd2a4136e2e7656a569d1486fec18237
mode: fast
createdAt: 2026-09-28T21:42:00.613Z
isFinalized: true
groups: 51
rules: [errors-extend-base-error, no-casts, no-sleep-in-test]
reviewId: e04913c1
---

_2 error(s), 1 warning(s)._

# WARN e04913c1-1 no-sleep-in-test `packages/core/mesh/edge-client/src/edge-client.test.ts:93`

System One judges this a likely violation of `no-sleep-in-test` (No sleep or polling in tests), p=0.91. The likeliest place is lines 93-104 (`setTimeout(() => admitConnection.wake(), 20);`, location confidence 0.81). This is a single-shot classifier: confirm against the rule before acting.

# ERROR e04913c1-2 errors-extend-base-error `packages/core/mesh/edge-client/src/edge-client.ts:37`

System One judges this a likely violation of `errors-extend-base-error` (Error classes are defined with `BaseError.extend`, never by subclassing `Error` or a tagged-error factory), p=0.86. The likeliest place is lines 37-49 (`import { EdgeConnectionClosedError, EdgeIdentityChangedError } from './errors...`, location confidence 0.86). This is a single-shot classifier: confirm against the rule before acting.

# ERROR e04913c1-3 no-casts `packages/core/mesh/edge-client/src/testing/test-utils.ts:87`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.97. The likeliest place is lines 87-100 (`admittedAttempts: () => [...admittedAttempts],`, location confidence 0.38). This is a single-shot classifier: confirm against the rule before acting.
