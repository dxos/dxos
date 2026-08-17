---
'@dxos/echo': patch
---

Replace client-side polling of feed sync state with a real streaming RPC (`FeedService.subscribeSyncState`): the host now pushes a fresh backlog snapshot when it actually changes, instead of the client asking on a timer.
