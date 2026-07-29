---
'@dxos/echo-panproto': minor
---

New `Lens` namespace in `@dxos/echo-panproto`: an **object lens** that views one live ECHO object through a second declared type. Sibling of the existing `Panproto` wire lens, which crosses the serialization boundary to a foreign record — an object lens never creates a second object, so reads project the base object and writes invert onto it.

A lens binds two written-out types (`Lens.make(id, Source, Target, mapping)`), so the target's TypeScript type is the view's type and an interface written once against the target works for every source that maps to it — a lensed object reports the _target's_ typename, so surfaces and forms already written for it resolve unchanged, while `Obj.getURI` still resolves to the underlying object.

The mapping is partial. A target property with a same-named, type-compatible source property maps itself; one with no counterpart stores itself in the object's annotation dictionary; a name match whose types are incompatible is reported by `Lens.coverage` as suspicious rather than auto-mapped or auto-overlaid, since either would record the same fact twice and let the copies drift.

`Lens.of` returns a live handle the ordinary `Obj.*` API accepts, including `Obj.update`, which batches every assignment in its callback into a single change that touches only the properties actually assigned — so two peers editing the same object through different lenses merge instead of clobbering each other. `Lens.checkLaws` verifies the GetPut round trip, and a declarative mapping can be persisted as an ordinary ECHO object (`Lens.Object`) referencing its value conversions by registered codec name.

The wire lens schema moved from `src/lens.ts` to `src/wire-lens.ts` (internal to the package; the `Panproto` export surface is unchanged).
