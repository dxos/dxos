---
branch: claude/sync-performance-debug-i1xelq
commit: 06a20446e30472a68a0d32f470f7e3860605356f
base: 2e61532f5b15d81af8ede2a64d3be33444108e2e
mode: fast
createdAt: 2026-09-28T20:39:48.297Z
isFinalized: true
groups: 47
rules: [no-casts, no-sleep-in-test]
reviewId: 06a20446
---

_1 error(s), 1 warning(s)._

# ERROR 06a20446-1 no-casts `packages/core/echo/echo-host/src/automerge/automerge-repo-subduction.test.ts:267`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.98. The likeliest place is lines 267-290 (`const hostHandle = await peer1.find<any>(url as AutomergeUrl);`, location confidence 0.75). This is a single-shot classifier: confirm against the rule before acting.

# WARN 06a20446-2 no-sleep-in-test `packages/core/echo/echo-host/src/automerge/automerge-repo-subduction.test.ts:579`

System One judges this a likely violation of `no-sleep-in-test` (No sleep or polling in tests), p=0.95. The likeliest place is lines 579-602 (`});`, location confidence 0.28). This is a single-shot classifier: confirm against the rule before acting.
