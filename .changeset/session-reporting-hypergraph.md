---
'@dxos/echo-client': patch
'@dxos/echo': minor
'@dxos/types': minor
'@dxos/plugin-tasks': minor
---

`Hypergraph.Service` is the cross-space counterpart to `Database.Service`: query every space, or
reach one by id. `Hypergraph.withDatabase(spaceId)` narrows it back to a `Database.Service`,
failing with `SpaceNotFoundError` when the graph holds no such space. Declaring the database is
what marks an operation as acting on one space, so work that must _find_ its space — rather than be
told it — declares the graph instead.

`RemoteSession` gains `summary` (one sentence from the agent, distinct from `lastMessage`) and
`isStale`/`STALE_AFTER_MS` for readers that need to know when `state` stopped describing a session.

`RecordSession` places itself: it looks a session up across spaces by its harness id, updates it
wherever it lives, and when it is unregistered and no space was named it writes nothing and returns
the exact call to retry with. A successful report also answers with the open tasks the session is
assigned, so a heartbeat doubles as a reminder of what the session is for.

A task assigned to an agent now renders as the harness that owns it rather than a generic "agent",
with a hover card showing the session's state, checkout and last message.

A cross-space query (`from('all-accessible-spaces')`) now names every space the graph holds rather
than carrying an empty scope: the index host answers a space-less query with nothing, so such a
query used to return only what some earlier space-scoped read had already pulled into the working
set — a space nobody had read from in the process contributed no results at all, silently.
