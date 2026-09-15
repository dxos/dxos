---
'@dxos/echo': minor
---

An edge-hosted agent session can complete a turn, call a tool, and wake itself.

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
- Reads that follow the process's own writes no longer depend on the eventually-consistent space
  index catching up first. A hosted feed read is served by that index, so an agent's own append
  could read back empty and nothing would look again. Queued prompts re-arm a short alarm while a
  write is unread (staying resident rather than completing if it never lands), a handled message is
  suppressed durably by id so a stale index cannot redeliver it, and a self-scheduled alarm is armed
  from the record just written instead of from a read of it — without which a wake was silently
  never scheduled.
- A completion decision no longer counts tool results already reported, which hung a turn on work
  that was in fact done, and a prompt submitted to a finished session resubmits rather than landing
  on a dead handle.
