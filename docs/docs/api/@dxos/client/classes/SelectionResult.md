# Class `SelectionResult`
Declared in [`packages/core/echo/echo-db/dist/src/packlets/database/selection/result.d.ts:16`]()


Query subscription.
Represents a live-query (subscription) that can notify about future updates to the relevant subset of items.

## Constructors
### [`constructor`]()


Returns: [`SelectionResult`](/api/@dxos/client/classes/SelectionResult)`<T, R>`

Arguments: 

`_execute`: `function`

`_update`: `Event<`[`Entity`](/api/@dxos/client/classes/Entity)`<Model<any, any>>[]>`

`_root`: `SelectionRoot`

`_reducer`: `boolean`

## Properties
### [`update`]()
Type: `Event<`[`SelectionResult`](/api/@dxos/client/classes/SelectionResult)`<T, any>>`

Fired when there are updates in the selection.
Only update that are relevant to the selection cause the update.
### [`entities`]()
Type: `T[]`

Get the result of this selection.
### [`root`]()
Type: `SelectionRoot`

The root of the selection. Either a database or an item. Must be a stable reference.
### [`value`]()
Type: `[object Object] extends [object Object] ? [object Object] : [object Object]`

Returns the selection or reducer result.

## Methods
### [`expectOne`]()


Return the first element if the set has exactly one element.

Returns: `T`

Arguments: none
### [`refresh`]()


Re-run query.

Returns: [`SelectionResult`](/api/@dxos/client/classes/SelectionResult)`<T, R>`

Arguments: none
### [`toString`]()


Returns: `string`

Arguments: none