---
'@dxos/echo': minor
'@dxos/plugin-client': minor
---

Edits the client worker has not saved are no longer lost without warning. `EchoDatabase.hasUnsavedChanges()` and the save-state event now count changes still in flight, documents not yet created and unsent feed appends. Composer shows "Error saving changes." while sends fail. The browser, the desktop app's quit and window close, and the updater's relaunch now save those changes first, or ask before leaving. After a leader handover, a tab's ECHO client now reconnects to the new worker and hands it every change the old worker had not taken. A worker whose SQLite connection stops answering for two minutes is replaced, and a worker shutdown no longer waits indefinitely on a teardown that hangs.
