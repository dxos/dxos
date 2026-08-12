---
'@dxos/plugin-connector': patch
---

Restore the Connect action on a mailbox or calendar whose connection was deleted: a binding left without its connection no longer counts as connected, deleting a connection from its settings panel removes its bindings, and re-binding a target clears the orphan its old connection left behind.
