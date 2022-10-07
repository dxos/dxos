# Class `Selection`
> Declared in [`packages/core/echo/echo-db/dist/src/packlets/database/selection/selection.d.ts`](undefined)

Selections are used to construct database subscriptions.
They are [monads](https://www.quora.com/What-are-monads-in-computer-science) that support
the functional composition of predicates to traverse the graph.
Additionally, selections may be used to create reducers that compute an aggregated value over the traversal.

Implementation:
Each Selection contains a visitor

## Constructors
```ts
new Selection(
_visitor: Function,
_update: Event<Entity<Model<any, any>>[]>,
_root: SelectionRoot,
_reducer: boolean
)
```

---
- Selection : Class
- T : Type parameter
- R : Type parameter
- constructor : Constructor
- new Selection : Constructor signature
- T : Type parameter
- R : Type parameter
- _visitor : Parameter
- __type : Type literal
- __type : Call signature
- options : Parameter
- _update : Parameter
- _root : Parameter
- _reducer : Parameter
- _createSubSelection : Property
- _reducer : Property
- _root : Property
- _update : Property
- _visitor : Property
- root : Accessor
- root : Get signature
- call : Method
- call : Call signature
- visitor : Parameter
- children : Method
- children : Call signature
- this : Parameter
- filter : Parameter
- exec : Method
- exec : Call signature
- options : Parameter
- filter : Method
- filter : Call signature
- this : Parameter
- filter : Parameter
- filter : Call signature
- U : Type parameter
- this : Parameter
- filter : Parameter
- links : Method
- links : Call signature
- this : Parameter
- filter : Parameter
- parent : Method
- parent : Call signature
- this : Parameter
- query : Method
- query : Call signature
- options : Parameter
- refs : Method
- refs : Call signature
- this : Parameter
- filter : Parameter
- source : Method
- source : Call signature
- this : Parameter
- filter : Parameter
- target : Method
- target : Call signature
- this : Parameter
- filter : Parameter
