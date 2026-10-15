---
'@dxos/teleport-extension-gossip': patch
---

Presence's offline sweep fires `updated` only when a peer has aged out since it was reported online. It fired on every sweep, every 20 s per space, and each one made the client re-serialize every space for the app.
