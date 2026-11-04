---
'@dxos/ui-editor': patch
---

Collaborator cursors now reach a peer that joins a document after the others last moved. `SpaceAwarenessProvider` queries for peers only once its listener is registered, answers a peer's first post with its own state, and re-sends its state every 15 seconds for peers whose connection came up after its last post.
