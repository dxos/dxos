---
'@dxos/test-utils': patch
'@dxos/ui-editor': patch
---

Collaborator cursors now reach a peer that joins a document after the others last moved. `SpaceAwarenessProvider` queries for peers only once its listener is registered, answers a peer's first post with its own state, and re-sends its state every 15 seconds for peers whose connection came up after its last post. Remote state is kept per session (each open editor), so a person with a document open on two devices or in two tabs shows one caret, from whichever session moved last, instead of the two overwriting each other. A session is dropped when it closes, or within a minute of its last post.

An empty editor shows one placeholder at a time: the commands hint ("Press / for commands") replaces the editor's placeholder instead of rendering beside it. `createBasicExtensions` uses the new `emptyPlaceholder`, which gives way while a `placeholder` hint shows. Placeholders also sort after other widgets at their position, so a collaborator's caret in an empty document draws where the document starts rather than after the placeholder text. `placeholderWidget` builds that decoration for other extensions.

On macOS, `setupPage` gives each Playwright WebKit context its own home directory, so each context gets its own OPFS. Before this, two peers in one test shared one identity.
