---
'@dxos/echo': minor
'@dxos/compute-runtime': minor
'@dxos/observability': minor
---

Report what users and agents write in a space as product events, however the write happened. ECHO emits vendor-neutral events on a new `trace.events` channel in `@dxos/tracing` for adds and removes of objects and relations, persisted types, and feed appends. Each event carries an origin (`user`, `agent`, `integration` or `system`), passed with the new `origin` write option or provided once as `Database.Origin`; it replaces the `track` add option. Operations running in an agent's conversation attribute their writes to the agent. The new `ObservabilityProvider.ObjectEvents` data provider reports user and agent writes as `space.object.add`, `space.object.remove`, `space.relation.add`, `space.relation.remove`, `space.type.add` and `space.feed.append`.
