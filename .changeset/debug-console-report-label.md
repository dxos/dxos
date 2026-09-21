---
'@dxos/plugin-support': minor
---

A support report carries an optional `labels` list through to the support service, and the debug
console's `report` command sets it to `Composer Feedback Form` — the label the PostHog feedback
submissions sync under — so console-filed issues land in the same triage view. `--label` overrides
it.
