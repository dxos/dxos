---
'@dxos/app-toolkit': minor
'@dxos/plugin-projects': patch
---

Fix the task row's "Copy prompt" action in Safari and the desktop app: the clipboard write now starts inside the click, and an `ObjectAction` invocation can name the output text to copy via `clipboard`.
