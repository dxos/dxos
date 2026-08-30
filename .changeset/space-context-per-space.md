---
'@dxos/echo-host': patch
'@dxos/client-services': patch
---

Fix a space's directory-update context being torn down by another space that shares its root document, and keep an accepted space's anchor retry alive after the invitation context is disposed.
