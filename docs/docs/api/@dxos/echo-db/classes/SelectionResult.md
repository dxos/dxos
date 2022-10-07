# Class `SelectionResult`
> Declared in package `@dxos/echo-db`

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
