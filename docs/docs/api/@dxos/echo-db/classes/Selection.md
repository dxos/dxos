# Class `Selection`
> Declared in [`packages/core/echo/echo-db/src/packlets/database/selection/selection.ts`](https://github.com/dxos/protocols/blob/main/packages/core/echo/echo-db/src/packlets/database/selection/selection.ts#L71)

Selections are used to construct database subscriptions.
They are [monads](https://www.quora.com/What-are-monads-in-computer-science) that support
the functional composition of predicates to traverse the graph.
Additionally, selections may be used to create reducers that compute an aggregated value over the traversal.

Implementation:
Each Selection contains a visitor

## Constructors
```ts
const newSelection = new Selection(
_visitor: Function,
_update: Event<Entity<Model<any, any>>[]>,
_root: SelectionRoot,
_reducer: boolean
)
```

## Properties

## Functions
