---
'@dxos/compute': minor
---

Every `Agent.Service` verb now requires only `Agent.Service`. Session verbs (`Agent.open`, `submitPrompt`, `waitForCompletion`, ...) take the database from the session, and the current-process verbs (`Agent.currentSession`, `currentFeed`, `currentAgent`, `currentThread`, `enqueueMessage`, `setAlarm`, `spawn`) find their caller through `Process.current` and resolve its database through the runtime's `ServiceResolver`. `Process.current` now reads the new `Process.CurrentProcess` reference, which each process handle sets on the context its handlers run with, so it no longer requires `Process.ManagerService`; `Manager.current` returns the same process.
