---
'@dxos/echo-client': patch
'@dxos/plugin-review': patch
---

Index query hydration arms one timer per pass instead of one per 64-record chunk, so re-hydrating a large reactive result no longer repeatedly arms and clears timers on the main thread. Records that outrun the hydration budget are still reported as stalled.

Replying to a new comment while its thread is still being saved no longer deletes the thread. The reply now waits for the save to end and is then added to the thread.
