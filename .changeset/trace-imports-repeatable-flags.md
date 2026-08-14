---
'@dxos/plugin-projects': patch
'@dxos/plugin-tasks': patch
'@dxos/plugin-jmap': patch
'@dxos/plugin-google': patch
---

`dx-trace-imports` accepts repeated `--export` and `--to`, so one guard can cover every entry a headless host imports instead of a task per entry. Repeating a flag previously stringified the array into a value matching nothing, so the check passed while enforcing nothing.
