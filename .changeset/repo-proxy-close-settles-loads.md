---
'@dxos/echo-client': patch
---

Closing a `RepoProxy` now rejects `whenReady()` with `RepoClosedError` for a document that was still loading, instead of leaving it pending forever.
