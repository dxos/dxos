---
'@dxos/client': minor
'@dxos/plugin-space': minor
---

A space can now be migrated off its hypercore control feed onto an Automerge space root that EDGE mints, with `space.internal.migrateSpaceRoot()` or the new "Credential storage → Migrate" button in Composer's space settings. Every other member adopts that same root the next time it opens the space, and `space.internal.data.spaceRootUrl` reports the root a device has adopted. `EdgeHttpClient` gains `migrateSpaceRoot` and `getSpaceRoot`.
