---
'@dxos/echo': patch
---

Peers joining or editing a space through EDGE no longer stall: a feed block pushed ahead of the metadata reply no longer leaves a gap that blocks feed admission, and a commit EDGE advertises alongside a stale head is now detected as missing and reapplied from local storage.
