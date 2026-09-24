---
'@dxos/plugin-search': patch
---

The Search deck companion no longer goes missing for a whole session when the app graph builds before the client finishes initializing. The connector now builds the companion with no space until initialization completes, then re-evaluates and resolves the active space.
