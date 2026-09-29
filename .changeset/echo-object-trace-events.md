---
'@dxos/echo': minor
'@dxos/compute-runtime': minor
'@dxos/app-framework': minor
'@dxos/observability': minor
---

Report every write to a space as a product event, however it happened, with whether it was a person's action. ECHO emits vendor-neutral events on a new `trace.events` channel in `@dxos/tracing` for adds and removes of objects and relations, persisted types, and feed appends, named by `Database.TraceEvents`. Each carries an origin: `user` for a person's own action, `system` for everything else (agents, syncs and imports, seeding, automation), or `unknown` when nothing attributed the write, so unattributed call sites stay visible. The origin is passed with the new `origin` write option or provided once as `Database.Origin`, and replaces the `track` add option. Operations the app framework's invoker runs are attributed to the `user`, trigger runs and operations in an agent's conversation to the `system`, and each process passes its origin to the operations it invokes. The new `ObservabilityProvider.ObjectEvents` data provider reports every write as `space.object.add`, `space.object.remove`, `space.relation.add`, `space.relation.remove`, `space.type.add` or `space.feed.append`, with the `origin` as a property.
