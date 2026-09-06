---
'@dxos/echo': patch
---

Reading a property on an ECHO object is roughly an order of magnitude cheaper. A record now carries its
current values as own properties, so a read is served by the engine rather than by a proxy trap:
automerge-backed reads fall from ~1.7 µs to ~25 ns, unpersisted and feed-backed reads from ~290 ns to the
same, and the cost no longer depends on how many fields the object has. Object identity, `Object.keys`,
spread, `JSON.stringify` and the error thrown by a write outside `Obj.update` are all unchanged.

A change arriving from elsewhere is also cheaper to apply: only the values it actually moved are rebuilt,
so a `Ref` on a field the change did not touch stays the same instance instead of being replaced on every
edit to any other field of the object.
