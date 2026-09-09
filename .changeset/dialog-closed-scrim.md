---
'@dxos/ui-theme': patch
---

A dialog's scrim no longer swallows clicks once the dialog is closed. The presence machine unmounts it on `animationend`, which does not always arrive, leaving an invisible closed backdrop over the page and making everything behind it unclickable.
