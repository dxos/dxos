---
'@dxos/plugin-deck': patch
'@dxos/ui-theme': patch
---

Stop the dialog and the app behind it flickering while a view transition runs. A dialog overlay had no `view-transition-name`, so the content group painted over it and it vanished for the length of the transition; a dialog that closed lost its content while its overlay was still exiting; and an open that crossed workspaces swapped the whole chrome un-animated before starting a separate transition for the planks, which now land together in one.
