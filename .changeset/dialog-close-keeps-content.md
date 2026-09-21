---
'@dxos/plugin-deck': patch
---

Play the dialog's exit animation instead of emptying it: closing a dialog cleared its content in the same update that closed it, leaving the overlay alone on screen for the length of its exit — a dimmed app with nothing on it.
