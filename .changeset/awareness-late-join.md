---
'@dxos/ui-editor': patch
---

Collaborator cursors now reach a peer that joins a document after the others last moved. `SpaceAwarenessProvider` queries for peers only once its listener is registered, answers a peer's first post with its own state, and re-sends its state every 15 seconds for peers whose connection came up after its last post.

An empty editor shows one placeholder at a time: the commands hint ("Press / for commands") replaces the editor's placeholder instead of rendering beside it. `createBasicExtensions` uses the new `emptyPlaceholder`, which gives way while a `placeholder` hint shows. Placeholders also sort after other widgets at their position, so a collaborator's caret in an empty document draws where the document starts rather than after the placeholder text. `placeholderWidget` builds that decoration for other extensions.
