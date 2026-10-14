---
'@dxos/echo': minor
'@dxos/plugin-client': minor
---

Edits the client worker has not saved are no longer lost without warning. The new `EchoDatabase.hasUnsavedChanges()` reports changes still in flight, documents not yet created and unsent feed appends, and the save-state event counts them too. Composer shows "Error saving changes." while sends fail. The browser, the desktop app's tray Quit and window close, and the updater's relaunch save those changes first, or ask before leaving; on macOS, Cmd+Q and the Dock's Quit are not held yet. After a leader handover, a tab's ECHO client reconnects to the new worker and hands it every change the old worker had not taken. A worker whose SQLite connection stops answering for two minutes is replaced, and a worker shutdown no longer waits indefinitely on a teardown that hangs.

Breaking: `EchoDatabase` gains the required `hasUnsavedChanges()` method, and `SaveStateChangedEvent` gains the required `pendingCreations` and `failing` fields, so code that implements the interface or constructs the event must add them.
