---
'@dxos/app-toolkit': patch
---

Opening a space's settings closes the companion, as opening the app settings already does. Both use a new `LayoutOperation.closeCompanion()`, which treats a layout without companions as nothing to close.
