---
'@dxos/echo': minor
---

`ActionMenu` takes a `deferUntilOpen` prop, which renders the trigger alone until its first click
and builds the menu then, and `actions` may now be a thunk so a menu that is never opened builds
neither its items nor their labels. A task row uses it for all four of its menus, so a list no
longer builds a state machine per row for menus nobody opens.
