---
'@dxos/plugin-client': patch
---

Fix an uncaught `Space is not initialized` error thrown from the space replication-progress capability. The `client.spaces` subscription fires while a space is still initializing (on app load and during space creation), and the space name was read eagerly from `space.properties`, whose getter throws until the space is ready. The name is now read lazily per sync-state update and only once the space reaches `SPACE_READY`.
