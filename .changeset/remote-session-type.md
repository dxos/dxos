---
'@dxos/types': minor
'@dxos/plugin-tasks': minor
---

Add `RemoteSession` — a coding-agent session reflected into the graph, so the work an agent is doing is visible next to the work it was asked to do.

The harness's session identifier is carried as an ECHO **foreign key** (`Obj.getMeta().keys`, source `claude.ai/code`) rather than a property — the session is a record in another system, and that is where ECHO already keeps such a correspondence. A hook can therefore address the object through `Filter.foreignKeys` by the one identifier every hook event carries, with no property whose uniqueness nothing enforces. It records `state` (`running`/`finished`/`failed`/`unknown`), `started`/`lastCheckedIn`/`finished` timestamps, a prose `lastMessage` for what the session last did, and the repo/branch/worktree it is working in. `lastCheckedIn` is separate from `updated` because a session whose host went away leaves `running` behind forever — readers age a stale session out on the heartbeat rather than trusting a close event that a reclaimed container never sends.

`Actor` gains an optional untyped `subject` ref, so an actor can stand for something other than a person; a `RemoteSession` set there makes an agent session a task assignee.

Two operations in `plugin-tasks` drive it, both projected to MCP: `org.dxos.operation.tasks.recordSession` (an idempotent upsert keyed on `sessionId` — create, check in and close are one verb, so two hooks bound to different events cannot disagree about a session's state) and `org.dxos.operation.tasks.listSessions`.
