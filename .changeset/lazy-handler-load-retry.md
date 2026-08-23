---
'@dxos/compute': patch
---

A failed lazy operation handler load is no longer memoized, so retrying the operation re-imports the module. Previously `OperationHandlerSet.lazy` cached the rejected dynamic-import promise, so once a chunk fetch failed — e.g. a stale asset hash after a redeploy — every later invocation of that operation rejected instantly without re-fetching, and only a page reload recovered.
