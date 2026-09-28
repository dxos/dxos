---
branch: claude/sync-performance-debug-i1xelq
commit: 774e2e2f3926d333b28f83f06ab1f3d2faa30a26
base: ff6a268f306953a8087dbf6dd8d474e85a5d5200
mode: fast
createdAt: 2026-09-28T13:13:54.983Z
isFinalized: true
groups: 50
rules: [errors-extend-base-error]
reviewId: 774e2e2f
---

_1 error(s), 0 warning(s)._

# ERROR 774e2e2f-1 errors-extend-base-error `packages/core/mesh/edge-client/src/edge-ws-muxer.ts:336`

System One judges this a likely violation of `errors-extend-base-error` (Error classes are defined with `BaseError.extend`, never by subclassing `Error` or a tagged-error factory), p=0.87. The likeliest place is lines 336-349 (`export class SegmentedMessageLimitError extends Error {`, location confidence 0.99). This is a single-shot classifier: confirm against the rule before acting.
