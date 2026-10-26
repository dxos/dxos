---
'@dxos/plugin-google': patch
---

Mail sync Routines created before the Gmail and JMAP sync operations moved out of plugin-inbox run again, instead of failing with `NoHandlerError` on every scheduled tick.
