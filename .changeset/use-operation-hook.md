---
'@dxos/app-framework': minor
---

`useOperation(operation, map, options?)` in `@dxos/app-framework/ui`: binds an operation to a UI callback in one step — `map` turns the component's callback arguments into the operation input, and the returned handler keeps a stable identity across renders (the mapper and options are read through refs).
