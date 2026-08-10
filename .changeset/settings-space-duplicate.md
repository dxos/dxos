---
'@dxos/app-toolkit': patch
'@dxos/plugin-space': patch
---

Make a profile with two settings spaces resolve to the same one everywhere.

Two clients that both observe no settings space could both create one — a second tab, or a reload racing the first. `getSettingsSpace` now resolves duplicates deterministically, preferring the space carrying the default-space designation and then by id, so any client seeing the same set of spaces picks the same one instead of depending on list order. `ensureSettingsSpace` re-checks after creating and discards the space it created when it loses that tie-break; each client only ever deletes its own.

This narrows the window rather than closing it: a client that has not yet seen another's settings space still sees itself as canonical and keeps what it created, so a duplicate can survive until the lists converge. It is then consistently ignored rather than competing.
