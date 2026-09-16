---
'@dxos/app-toolkit': patch
'@dxos/plugin-space': patch
---

Fix settings-space duplication on replicating devices, and heal profiles that already carry duplicates.

Spaces replicate to a freshly joined or recovered device in creation order, so the legacy personal space always landed before the settings space — and because the legacy tag is immutable and outlives migration, the bootstrap concluded "unmigrated legacy profile" and created another settings space on every such boot, which then replicated to every device.

Absence is unprovable in an eventually-consistent system, so instead of guarding the create the profile now converges. The survivor is the lowest-id tagged space — a pure function of replicated state, so every device picks the same winner and no device can ever tombstone it. Once the survivor is ready, each duplicate's configuration (properties annotations, including the default-space designation, plus the cross-space ordering) is folded into it and the duplicate is tombstoned, which replicates to the user's other devices; a duplicate holding content the salvage does not recognize is kept rather than destroyed.
