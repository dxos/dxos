# Class `SelectionResult`
> Declared in [`packages/core/echo/echo-db/dist/src/packlets/database/selection/result.d.ts`]()

Query subscription.
Represents a live-query (subscription) that can notify about future updates to the relevant subset of items.

## Constructors
```ts
new SelectionResult <T, R> (_execute: function, _update: Event<Entity<Model<any, any>>[]>, _root: SelectionRoot, _reducer: boolean) => SelectionResult<T, R>
```

## Properties
### `update: Event<SelectionResult<T, any>>`
Fired when there are updates in the selection.
Only update that are relevant to the selection cause the update.

## Functions
```ts
expectOne () => T
```
Return the first element if the set has exactly one element.
```ts
refresh () => SelectionResult<T, R>
```
Re-run query.
```ts
toString () => string
```