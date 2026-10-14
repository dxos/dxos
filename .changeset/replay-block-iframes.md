---
'@dxos/observability': patch
---

Session replay no longer keeps removed DOM alive. Elements that directly contain an iframe are left out of recordings, since the recorder never releases a cross-origin iframe removed along with an ancestor, and that iframe kept the whole removed tree in memory.
