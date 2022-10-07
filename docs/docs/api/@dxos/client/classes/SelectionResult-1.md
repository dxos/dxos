# Class `SelectionResult`
> Declared in [`packages/core/echo/echo-db/dist/src/packlets/database/selection/result.d.ts`](undefined)

Query subscription.
Represents a live-query (subscription) that can notify about future updates to the relevant subset of items.

## Constructors
```ts
new SelectionResult(
_execute: Function,
_update: Event<Entity<Model<any, any>>[]>,
_root: SelectionRoot,
_reducer: boolean
)
```

---
- SelectionResult : Class
- T : Type parameter
- R : Type parameter
- constructor : Constructor
- new SelectionResult : Constructor signature
- T : Type parameter
- R : Type parameter
- _execute : Parameter
- __type : Type literal
- __type : Call signature
- _update : Parameter
- _root : Parameter
- _reducer : Parameter
- _execute : Property
- _lastResult : Property
- _reducer : Property
- _root : Property
- _update : Property
- update : Property
- entities : Accessor
- entities : Get signature
- root : Accessor
- root : Get signature
- value : Accessor
- value : Get signature
- expectOne : Method
- expectOne : Call signature
- refresh : Method
- refresh : Call signature
- toString : Method
- toString : Call signature
