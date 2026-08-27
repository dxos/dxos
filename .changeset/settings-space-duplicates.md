---
'@dxos/app-toolkit': patch
'@dxos/plugin-space': patch
---

Fix settings-space duplication on replicating devices, and heal profiles that already carry duplicates.

Spaces replicate to a freshly joined or recovered device in creation order, so the legacy personal space always landed before the settings space — and because the legacy tag is immutable and outlives migration, the bootstrap concluded "unmigrated legacy profile" and created another settings space on every such boot. The resolver now treats a settings-tagged `SpaceMember` credential in the HALO as proof the space exists and waits for it instead of creating (`AppSpace.hasSettingsSpaceCredential`).

Profiles that already accumulated duplicates converge: once the canonical settings space (now resolved deterministically — designation first, then space id, so every device picks the same winner) is ready, each duplicate's cross-space ordering is folded into it and the duplicate is tombstoned, which replicates to the user's other devices.
