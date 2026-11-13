---
'@dxos/client': minor
'@dxos/plugin-client': minor
---

An identity can now be migrated off its HALO control feed onto an Automerge space root that EDGE mints, with `client.halo.migrateIdentityRoot()` or the new "Credential storage → Migrate" button in Composer's profile settings. Every other device of the identity adopts that same root the next time it opens, and HALO documents replicate through EDGE once the identity has a root. A migrated space, or identity, now keeps copying new credentials into its credentials document after a reload.
