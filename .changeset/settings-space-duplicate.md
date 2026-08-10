---
'@dxos/app-toolkit': patch
'@dxos/plugin-space': patch
---

Stop a profile from acquiring a second settings space.

Two clients that both observe no settings space could both create one — a second tab, or a reload racing the first. `getSettingsSpace` now resolves duplicates deterministically, preferring the space carrying the default-space designation and then by id, so every device and every boot agree rather than depending on list order. `ensureSettingsSpace` re-checks after creating and discards the space it created when it loses that tie-break; each client only ever deletes its own.
