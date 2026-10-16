---
'@dxos/app-toolkit': patch
'@dxos/client': patch
'@dxos/client-protocol': patch
'@dxos/client-services': patch
'@dxos/credentials': patch
'@dxos/plugin-file-system': patch
'@dxos/plugin-space': patch
'@dxos/protocols': patch
---

A `SettingsSpace` HALO credential now names each identity's settings space, so every device settles on the same one. A device names it only after its HALO has synced with EDGE, via the new `client.halo.syncToEdge()`. Duplicate settings spaces are merged key by key into the named space and deleted only after a week, once they hold nothing left to merge.
