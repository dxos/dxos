---
'@dxos/app-framework': minor
'@dxos/types': patch
---

`useOperation(operation, map, options?)` in `@dxos/app-framework/ui`: binds an operation to a UI callback in one step — `map` turns the component's callback arguments into the operation input, and the returned handler keeps a stable identity across renders (the mapper and options are read through refs). `Optimistic.make(source)` in `@dxos/app-framework` overlays ordered optimistic entries on a reactive row-source atom (apply entries retire on the first source emission after the operation settles and auto-revert on failure; retain entries pin rows evicted from a filtered source through a grace window), and `useOptimisticOperation` binds an operation dispatch to such an overlay. `TaskSet.reorderItems` in `@dxos/types` generalizes `TaskSet.reorder` over any keyed list so optimistic transforms share the handler's ordering.
