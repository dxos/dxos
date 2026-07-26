---
'@dxos/echo': patch
---

Fix: re-entering Suggesting mode no longer strikes through text typed on main in between. An unedited per-user suggestion branch whose fork point fell behind is retired and re-forked at the current heads; a branch with pending suggestions is preserved.
