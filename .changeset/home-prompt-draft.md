---
'@dxos/assistant': minor
'@dxos/plugin-assistant': patch
---

The space Home assistant prompt no longer adds a feed to the space on every visit: its chat is an in-memory draft until the user sends, when the chat, its feed and its bindings are written together. `AiContext.Binder` now opens over a feed that is not stored yet, holding bindings in memory until `flush()` writes them once the feed is stored, and `unbind` removes an object from the bound set immediately whichever URI form the ref uses.
