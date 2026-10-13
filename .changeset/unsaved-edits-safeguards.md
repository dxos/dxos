---
'@dxos/echo': minor
'@dxos/plugin-client': minor
---

Changes the client worker has not saved are no longer lost silently: `EchoDatabase.hasUnsavedChanges()` and the save-state event now count edits still in flight and documents not yet created, Composer shows "Error saving changes." while sends fail, and the browser, the desktop app's quit and the updater's relaunch wait for those changes or ask first. A worker whose SQLite connection stops answering for two minutes now emits `StorageStuck` and is replaced, and tabs re-send every change the old worker had not taken.
