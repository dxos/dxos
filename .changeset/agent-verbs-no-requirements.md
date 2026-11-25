---
'@dxos/compute': minor
---

Every `Agent.Service` verb now requires only `Agent.Service`. Session verbs (`Agent.open`, `submitPrompt`, `waitForCompletion`, ...) take the database from the session, and the current-process verbs (`Agent.currentSession`, `currentFeed`, `currentAgent`, `currentThread`, `enqueueMessage`, `setAlarm`, `spawn`) read the new `Process.CurrentProcess` reference, which the process manager sets on each process it runs, instead of the caller's `Process.ManagerService` and `Database.Service`.
