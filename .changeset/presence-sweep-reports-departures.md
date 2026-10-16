---
'@dxos/teleport-extension-gossip': patch
'@dxos/plugin-client': patch
---

An idle app stops redoing work while nothing changes. Presence's offline sweep fires `updated` only when a peer has aged out since it was reported online; it fired on every sweep, every 20 s per space, and each one made the client re-serialize every space for the app. The replication progress meter re-reads a space's sync state only while that space has a monitor open; the re-read ran every 10 s per space for the app's whole life, and each read had the ECHO worker diff the space's whole collection.
