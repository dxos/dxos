---
'@dxos/compute-runtime': patch
---

Fixed two `ProcessManager` spans that reported under the wrong name: process rehydration was exported as `ProcessManager.shutdown` and persisted-record discard as `ProcessManager.startup`. They are now `ProcessManager.rehydrate` and `ProcessManager.discardRecord`.
