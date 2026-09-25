---
'@dxos/echo-host': patch
---

Fix `waitUntilHeadsReplicated` hanging when the awaited change merges without visible patches (a concurrent write into an already-conflicted key): wait on `heads-changed` instead of `change`.
