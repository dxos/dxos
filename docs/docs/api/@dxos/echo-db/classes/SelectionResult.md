# Class `SelectionResult`
> Declared in [`packages/core/echo/echo-db/src/packlets/database/selection/result.ts`](https://github.com/dxos/protocols/blob/main/packages/core/echo/echo-db/src/packlets/database/selection/result.ts#L27)

Query subscription.
Represents a live-query (subscription) that can notify about future updates to the relevant subset of items.

## Constructors
```ts
const newSelectionResult = new SelectionResult(
_execute: Function,
_update: Event<Entity<Model<any, any>>[]>,
_root: SelectionRoot,
_reducer: boolean
)
```

## Properties

## Functions
