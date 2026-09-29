---
branch: claude/sync-performance-debug-i1xelq
commit: a68b20cc367810b16f6ef72a39ab7fe8eb36956a
base: e04913c152e9c91f7cc2091779948c60dc5e7e51
mode: fast
createdAt: 2026-09-28T21:46:28.163Z
isFinalized: true
groups: 47
rules: [no-casts, no-sleep-in-test]
reviewId: a68b20cc
---

_2 error(s), 1 warning(s)._

# WARN a68b20cc-1 no-sleep-in-test `packages/core/echo/echo-host/src/automerge/automerge-repo-subduction.test.ts:499`

System One judges this a likely violation of `no-sleep-in-test` (No sleep or polling in tests), p=0.95. The likeliest place is lines 499-522 (`await sleep(NO_TRAFFIC_WINDOW_MS);`, location confidence 0.71). This is a single-shot classifier: confirm against the rule before acting.

# ERROR a68b20cc-2 no-casts `packages/core/echo/echo-host/src/automerge/automerge-repo-subduction.test.ts:619`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.98. The likeliest place is lines 619-642 (`expect(getHeads(hostHandle.doc()!)).to.deep.equal(initialHostHeads);`, location confidence 0.50). This is a single-shot classifier: confirm against the rule before acting.

# ERROR a68b20cc-3 no-casts `packages/core/mesh/edge-client/src/testing/test-utils.ts:146`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.97. The likeliest place is lines 146-152 (`const decodePayload = async (request: Message, params: TestEdgeWsServerProps ...`, location confidence 0.36). This is a single-shot classifier: confirm against the rule before acting.
