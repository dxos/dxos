# Class `SelectionResult`
> Declared in [`packages/core/echo/echo-db/dist/src/packlets/database/selection/result.d.ts:16`]()


Query subscription.
Represents a live-query (subscription) that can notify about future updates to the relevant subset of items.

## Constructors
### constructor
```ts
<T, R> (_execute: function, _update: Event&lt;[Entity](/api/@dxos/client/classes/Entity)&lt;Model&lt;any, any&gt;&gt;[]&gt;, _root: SelectionRoot, _reducer: boolean) => [SelectionResult](/api/@dxos/client/classes/SelectionResult)&lt;T, R&gt;
```

## Properties
### update 
Type: Event&lt;[SelectionResult](/api/@dxos/client/classes/SelectionResult)&lt;T, any&gt;&gt;

Fired when there are updates in the selection.
Only update that are relevant to the selection cause the update.
### entities
Type: T[]

Get the result of this selection.
### root
Type: SelectionRoot

The root of the selection. Either a database or an item. Must be a stable reference.
### value
Type: [object Object] extends [object Object] ? [object Object] : [object Object]

Returns the selection or reducer result.

## Methods
### expectOne
```ts
() => T
```
Return the first element if the set has exactly one element.
### refresh
```ts
() => [SelectionResult](/api/@dxos/client/classes/SelectionResult)&lt;T, R&gt;
```
Re-run query.
### toString
```ts
() => string
```