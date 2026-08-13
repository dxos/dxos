---
'@dxos/plugin-connector': minor
---

A newly created bindable object (a Mailbox, say) now binds itself to the one connection already authorized for its type, when there is exactly one. Previously the object was created inert and the user had to open the Connect menu and pick the single entry it offered — a step with only one possible outcome. Ambiguity still goes to the user: with no connection there is nothing to bind, and with several the choice is real, so both keep the Connect action.

`bindConnectionToTarget` is now shared by the menu's reuse entry and the automatic path, so a binding made either way is identical.
