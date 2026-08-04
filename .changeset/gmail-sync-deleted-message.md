---
'@dxos/plugin-inbox': patch
---

Fix Gmail sync wedging permanently when a message is deleted before it is fetched: the 404 now drops that
message instead of failing the run and stranding the history token.
