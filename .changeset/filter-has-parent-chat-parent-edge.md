---
'@dxos/echo': minor
'@dxos/plugin-assistant': minor
---

Added `Filter.hasParent(boolean)` for selecting objects by parent presence (indexed, reactive to `Obj.setParent`). Breaking: the `Chat.CompanionTo` relation is removed — companion and agent chats are now linked to their subject by the ECHO parent edge (`Obj.setParent`), and the standalone-chats query selects unparented chats directly.

Companion chats are linked via `Chat.CompanionChatAnnotation` (refs stored on the subject object) plus the parent edge — `Chat.linkCompanion`; `Obj.setParent` now warns when the parent holds no ref to the child (to become an invariant). The `Err` module is renamed to `Error` (`@dxos/echo/Error`).
