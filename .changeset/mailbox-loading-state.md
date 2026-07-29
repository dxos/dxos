---
'@dxos/echo-react': patch
'@dxos/plugin-inbox': patch
---

`usePagination`'s `isLoading` now reflects genuine query settlement instead of clearing on the next microtask regardless of delivery, so consumers can reliably distinguish "still loading" from "loaded and empty" even for async, feed-backed queries. The mailbox article uses this to fix a bug where it could briefly flash the wrong empty-state message (e.g. "No connections configured") while a large mailbox's messages were still loading.
