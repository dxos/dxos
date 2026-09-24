---
'@dxos/plugin-deck': patch
---

Opening an object that is already open under another graph path, such as the same object reached through a different collection, now moves its plank onto the clicked path instead of doing nothing. Adding a plank with shift or the `add` disposition still reuses the open plank.
