---
'@dxos/echo': patch
---

`useFeedSyncState` no longer polls feed sync state while the document is hidden, and its default poll interval is now 15s — removing a per-space `peekPull` round-trip to edge every 5s for anyone with the devtools stats panel open.
