---
'@dxos/plugin-projects': minor
---

Adds `ProjectMailboxOperation.TriageMessages`, which triages a message feed, such as a synced Discord channel, into a project: each question gets a "Reply to" task carrying a drafted reply for someone to review, and the work a message asks for becomes a task. Runs incrementally and never duplicates a task.
