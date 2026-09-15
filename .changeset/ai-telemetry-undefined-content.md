---
# multiple-changesets: a telemetry guard in @dxos/ai found while running the incident eval; a reader chasing the logged error would not look under a sample space
'@dxos/ai': patch
---

Telemetry no longer logs an error for every model output whose content serializes to nothing. `JSON.stringify` returns `undefined` rather than a string for `undefined`, and the content annotation tried to truncate it; it now skips the attribute instead.
