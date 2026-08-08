---
'@dxos/client': patch
'@dxos/app-toolkit': patch
'@dxos/plugin-space': patch
---

Fix a boot hang caused by a space that has no properties object.

Space creation is two-phase — the host performs genesis and the client then writes the properties object — so an interruption in between left a space that could never open. `SpaceProxy` waited for those properties unbounded, inside `_processSpaceUpdate`'s mutex, wedging every later update for that space (and with it `_anySpaceUpdate`, so `setEdgeReplicationPreference` timed out) for the lifetime of the session. The wait is now bounded and writes the missing properties object, so an affected space recovers on next boot.

Two clients that both observe no settings space could both create one, which is how a profile ended up with a property-less duplicate on the boot path. `getSettingsSpace` now resolves duplicates deterministically — preferring the space carrying the default-space designation, then by id — and `ensureSettingsSpace` discards the space it created when it loses that tie-break.
