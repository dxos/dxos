---
'@dxos/plugin-space': patch
---

Settings sync no longer fails at startup when the settings space names a settings object that does not exist; it creates a new one instead. Merging duplicate settings spaces now moves the settings object into the surviving space, and keeps the duplicate while that object cannot be loaded.
