# Class `SelectionResult`
<sub>Declared in [packages/core/echo/echo-db/dist/types/src/packlets/database/selection/result.d.ts:16]()</sub>


Query subscription.
Represents a live-query (subscription) that can notify about future updates to the relevant subset of items.

## Constructors
### [constructor(_execute, _update, _root, _reducer)]()


Returns: <code>[SelectionResult](/api/@dxos/react-client/classes/SelectionResult)&lt;T, R&gt;</code>

Arguments: 

`_execute`: <code>function</code>

`_update`: <code>Event&lt;[Entity](/api/@dxos/react-client/classes/Entity)&lt;Model&lt;any, any&gt;&gt;[]&gt;</code>

`_root`: <code>SelectionRoot</code>

`_reducer`: <code>boolean</code>

## Properties
### [update]()
Type: <code>Event&lt;[SelectionResult](/api/@dxos/react-client/classes/SelectionResult)&lt;T, any&gt;&gt;</code>

Fired when there are updates in the selection.
Only update that are relevant to the selection cause the update.
### [entities]()
Type: <code>T[]</code>

Get the result of this selection.
### [root]()
Type: <code>SelectionRoot</code>

The root of the selection. Either a database or an item. Must be a stable reference.
### [value]()
Type: <code>[object Object] extends [object Object] ? [object Object] : [object Object]</code>

Returns the selection or reducer result.

## Methods
### [expectOne()]()


Return the first element if the set has exactly one element.

Returns: <code>T</code>

Arguments: none
### [refresh()]()


Re-run query.

Returns: <code>[SelectionResult](/api/@dxos/react-client/classes/SelectionResult)&lt;T, R&gt;</code>

Arguments: none
### [toString()]()


Returns: <code>string</code>

Arguments: none