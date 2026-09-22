---
'@dxos/plugin-deck': patch
'@dxos/ui-theme': patch
---

Stop the dialog and the app behind it flickering while a view transition runs. The app's dialog overlay now carries a `view-transition-name`, so the content group no longer paints over it and hides it for the length of every transition; the dialog's presentation is held as one value while it exits, so a closing dialog no longer loses its content, alignment and overlay styling while it is still on screen; and an open that crosses workspaces animates the chrome swap rather than hard-cutting to an empty deck.
