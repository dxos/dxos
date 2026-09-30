---
'@dxos/echo': minor
---

Reading a property on an ECHO object is roughly an order of magnitude cheaper. A record now carries its
current values as own properties, so a read is served by the engine rather than by a proxy trap:
automerge-backed reads fall from ~1.7 µs to ~25 ns, unpersisted and feed-backed reads from ~290 ns to the
same, and the cost no longer depends on how many fields the object has. A change arriving from elsewhere
is cheaper to apply too: only the values it actually moved are rebuilt, so a `Ref` on a field the change
did not touch stays the same instance instead of being replaced on every edit to the object.

**Breaking:** an `Obj.update` or `Type.update` callback must mutate through its parameter. Writability now
travels with the reference rather than with the callback's duration, so the object named outside stays
read-only for the whole of it and `Obj.update(obj, () => { obj.x = 1 })` throws where it previously
succeeded — write `Obj.update(obj, (obj) => { obj.x = 1 })`. The same applies to a reference captured
before the callback, and to the path-based helpers, which must be passed the parameter:
`Obj.update(obj, (obj) => Text.update(obj, 'name', 'x'))`. `@dxos/graph`'s `GraphChangeFunction` follows:
it now receives the writable mirror and must invoke its callback with it. Enforced at runtime, and by the
`consistent-update-param` lint rule, which is now an error.

Two long-standing defects go with it. An array reached through an assigned record or nested inside an
assigned array was neither gated nor reactive — it could be mutated outside `Obj.update` and notified
nobody; arrays are now reactive at every depth. And a live object's internal symbols no longer appear in
`Reflect.ownKeys`, so structurally hashing or deep-comparing one no longer dies reading
`Function.prototype.caller`. `Object.keys`, spread, `JSON.stringify` and object identity are unchanged.
