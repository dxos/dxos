---
'@dxos/ui-theme': minor
---

Cards and dialogs each sit one level lower on the surface ladder: a card takes the canvas's `base` level and a dialog (with sheets and drawers) the `raised` level, so both read darker in the dark theme and closer to the canvas in the light one. The `elevation` prop's explicit levels are unchanged, and `Select`'s list moves to the popup level with menus rather than following dialogs down.
