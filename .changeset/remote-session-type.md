---
'@dxos/types': minor
'@dxos/plugin-tasks': minor
---

Add `RemoteSession` — a coding-agent session reflected into the graph, so the work an agent is doing is visible next to the work it was asked to do.

The object is keyed on `sessionId`, the harness's own session identifier that every hook event carries, which lets a hook address it without a softer lookup. It records `state` (`running`/`finished`/`failed`/`unknown`), `started`/`lastCheckedIn`/`finished` timestamps, a prose `lastMessage` for what the session last did, and the repo/branch/worktree it is working in. `lastCheckedIn` is separate from `updated` because a session whose host went away leaves `running` behind forever — readers age a stale session out on the heartbeat rather than trusting a close event that a reclaimed container never sends.

`Actor` gains an optional untyped `subject` ref, so an actor can stand for something other than a person; a `RemoteSession` set there makes an agent session a task assignee.

Two operations in `plugin-tasks` drive it, both projected to MCP: `org.dxos.operation.tasks.recordSession` (an idempotent upsert keyed on `sessionId` — create, check in and close are one verb, so two hooks bound to different events cannot disagree about a session's state) and `org.dxos.operation.tasks.listSessions`.
