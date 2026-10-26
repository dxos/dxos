---
'@dxos/echo-client': patch
---

Index query hydration arms one timer per pass instead of one per record. On large reactive results, this removes tens of thousands of `setTimeout`/`clearTimeout` calls from the main thread. Records that outrun the hydration budget are still reported as stalled.
