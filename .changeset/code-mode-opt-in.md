---
'@dxos/plugin-assistant': minor
---

Code mode is off by default again. The `disableCodeMode` setting is replaced by `codeMode`, an opt-in ("Code mode (experimental)" in the assistant settings). A saved `disableCodeMode` is ignored; a `codeMode: true` saved before code mode became the default turns it on.
