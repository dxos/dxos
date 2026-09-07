---
'@dxos/echo': patch
'@dxos/plugin-github': patch
---

Fix type-safety and synchronization issues found by an automated code review, including a shape-compatibility encoding bug that could silently drop a selected oneof field.
