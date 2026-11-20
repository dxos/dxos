---
'@dxos/plugin-sandbox': minor
---

`SandboxService` can start a job: a command in an EDGE sandbox with its stdin open, whose output streams out and resumes from offsets, and which can be signalled. A later call re-attaches to it by id.
