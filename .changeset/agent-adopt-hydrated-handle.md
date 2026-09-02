---
'@dxos/compute-runtime': patch
'@dxos/agent-runtime': patch
---

Fixed "Process not hydrated" when an agent session was resolved from a persisted process that was not live. `AgentService.getSession` rediscovers such a process as a dormant, read-only handle and now adopts the live handle that `Handle.hydrate` returns instead of the dormant view, so the first prompt is delivered rather than dying.

`ProcessManager`'s dormant handles also support `terminate()` now: discarding a stale process (for example one whose immutable spawn annotations no longer match the request) deletes its record and those of its dormant descendants without booting it first.
