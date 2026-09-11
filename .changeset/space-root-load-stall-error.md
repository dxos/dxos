---
'@dxos/client-services': patch
'@dxos/client': patch
---

A space whose automerge root document never loads (e.g. after a network reconnect during space setup) now transitions to `SPACE_ERROR` after 30s instead of leaving `Space.waitUntilReady()` blocked forever with no diagnosis.
