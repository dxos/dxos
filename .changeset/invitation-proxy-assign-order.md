---
'@dxos/echo': patch
---

`SpaceList` now assigns its invitation proxy before awaiting, so `join()` cannot observe a window where the proxy is missing while the space list opens.
