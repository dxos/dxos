---
'@dxos/react-ui': minor
---

`Dialog.Root` (and `AlertDialog.Root`) accept a `backdrop` with `classNames` and `style` for the Content's scrim, so a host that opens dialogs it does not render can style their backdrop, as it already places them with `placement`. A dialog's backdrop no longer paints over the dialog when it mounts a commit after the positioner.
