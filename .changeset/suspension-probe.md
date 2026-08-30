---
'@dxos/observability': patch
---

Add a temporary suspension probe to every client realm: downloaded log bundles now record `[DEBUG H-suspend]` lines when a realm wakes from a ≥15s execution gap (wall vs monotonic clock deltas, page visibility), to confirm the native-app WebContent-suspension diagnosis in the field.
