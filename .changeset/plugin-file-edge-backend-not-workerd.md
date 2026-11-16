---
'@dxos/plugin-file': patch
---

plugin-file's EdgeBackend no longer activates in a plugin bundle on EDGE, where the Client capability it requires has no provider; InlineBackend serves file operations there, as it already did.
