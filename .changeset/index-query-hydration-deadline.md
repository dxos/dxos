---
'@dxos/echo-client': patch
---

Index query hydration arms one timer per pass instead of one per 64-record chunk, so re-hydrating a large reactive result no longer repeatedly arms and clears timers on the main thread. Records that outrun the hydration budget are still reported as stalled.
