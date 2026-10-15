---
'@dxos/plugin-client': patch
---

The replication progress meter re-reads a space's sync state only while that space has a monitor open. The re-read exists to close a monitor whose last update was missed; it ran every 10 s per space for the app's whole life, and each read had the ECHO worker diff the space's whole collection.
