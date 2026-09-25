---
'@dxos/plugin-native': patch
---

Distinguish the two disabled updater states in settings: a platform with no OTA channel still reads "Updates are not available on this platform", while a dev-server build on a platform that does support OTA now reads "Updates are not enabled in dev mode".
