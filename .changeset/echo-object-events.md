---
'@dxos/echo': minor
---

Every ECHO object now has an append-only feed of immutable events: define event types with `Type.makeEvent`, create events with `Event.make`, append them with `Obj.appendEvents(obj, events)`, and read them with `Query.events(obj, Type)` or the `query.events(Type)` traversal. Events have ids and may hold refs, but cannot have a parent, cannot be referenced or used as relation endpoints, and never appear in ordinary object queries; `Feed.Feed` objects reject events.
