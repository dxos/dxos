---
'@dxos/echo': minor
---

An edge-hosted agent session can complete a turn.

**Breaking:** `AgentService.layer` now _requires_ `RemoteProcessManager` rather than reading it
optionally. A `LayerSpec` stack never has a tag its spec does not require in context, so the
optional read always came back empty and every `location: 'edge'` session failed with "no
RemoteProcessManager is available" while the app had materialised one all along. Hosts without EDGE
satisfy it with `RemoteProcessManager.layerNoop`.

Also:

- `EdgeProcessManager.fromClient` supplies the full process-control surface; it was cancel-only,
  deferring to a `forSpace` that exists nowhere, so the manager an app builds lacked `spawn`/`list`.
- A `Process` definition declares the schemas its data model needs (`Process.types`), which the host
  registers with the process's database. Without them a typed feed query inside a hosted process
  matches nothing, so an agent appended a prompt and read its own queue back empty.
- A fresh agent no longer completes on its first empty-queue wake. `onSpawn` discards what it
  inherits, so a new process always starts empty; treating that as "work drained" ended the agent
  moments after spawn and dropped the prompt it was spawned for.
- A hosted agent re-arms a short alarm while a write it made is unread, instead of concluding its
  queue is drained. A hosted feed read is served by the eventually-consistent space index, so the
  agent's own append could read back empty and nothing would look again.
- `Process.Handle.requestAlarm` (optional — a handle for a process in another runtime cannot arm
  that runtime's timer).
