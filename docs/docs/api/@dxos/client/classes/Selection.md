# Class `Selection`
Declared in [`packages/core/echo/echo-db/dist/src/packlets/database/selection/selection.d.ts:32`]()


Selections are used to construct database subscriptions.
They are [monads](https://www.quora.com/What-are-monads-in-computer-science) that support
the functional composition of predicates to traverse the graph.
Additionally, selections may be used to create reducers that compute an aggregated value over the traversal.

Implementation:
Each Selection contains a visitor

## Constructors
### [`constructor`]()


Returns: [`Selection`](/api/@dxos/client/classes/Selection)`<T, R>`

Arguments: 

`_visitor`: `function`

`_update`: `Event<`[`Entity`](/api/@dxos/client/classes/Entity)`<Model<any, any>>[]>`

`_root`: `SelectionRoot`

`_reducer`: `boolean`

## Properties
### [`root`]()
Type: `SelectionRoot`

The root of the selection. Either a database or an item. Must be a stable reference.

## Methods
### [`call`]()


Visitor.

Returns: [`Selection`](/api/@dxos/client/classes/Selection)`<T, R>`

Arguments: 

`visitor`: `Callable<T, R>`
### [`children`]()


Select children of the items in this selection.

Returns: [`Selection`](/api/@dxos/client/classes/Selection)`<`[`Item`](/api/@dxos/client/classes/Item)`<any>, R>`

Arguments: 

`this`: [`Selection`](/api/@dxos/client/classes/Selection)`<`[`Item`](/api/@dxos/client/classes/Item)`<any>, R>`

`filter`: `ItemFilter`
### [`exec`]()


Finish the selection and return the result.

Returns: [`SelectionResult`](/api/@dxos/client/classes/SelectionResult)`<T, R>`

Arguments: 

`options`: `QueryOptions`
### [`filter`]()


Filter entities of this selection.

Returns: [`Selection`](/api/@dxos/client/classes/Selection)`<`[`Item`](/api/@dxos/client/classes/Item)`<any>, R>`

Arguments: 

`this`: [`Selection`](/api/@dxos/client/classes/Selection)`<`[`Item`](/api/@dxos/client/classes/Item)`<any>, R>`

`filter`: `ItemFilter`
Returns: [`Selection`](/api/@dxos/client/classes/Selection)`<U, R>`

Arguments: 

`this`: [`Selection`](/api/@dxos/client/classes/Selection)`<U, R>`

`filter`: `Predicate<U>`
### [`links`]()


Select links sourcing from the items in this selection.

Returns: [`Selection`](/api/@dxos/client/classes/Selection)`<`[`Link`](/api/@dxos/client/classes/Link)`<Model<any, any>, any, any>, R>`

Arguments: 

`this`: [`Selection`](/api/@dxos/client/classes/Selection)`<`[`Item`](/api/@dxos/client/classes/Item)`<any>, R>`

`filter`: `LinkFilter`
### [`parent`]()


Select parent of the items in this selection.

Returns: [`Selection`](/api/@dxos/client/classes/Selection)`<`[`Item`](/api/@dxos/client/classes/Item)`<any>, R>`

Arguments: 

`this`: [`Selection`](/api/@dxos/client/classes/Selection)`<`[`Item`](/api/@dxos/client/classes/Item)`<any>, R>`
### [`query`]()


Returns: [`SelectionResult`](/api/@dxos/client/classes/SelectionResult)`<T, R>`

Arguments: 

`options`: `QueryOptions`
### [`refs`]()


Select links pointing to items in this selection.

Returns: [`Selection`](/api/@dxos/client/classes/Selection)`<`[`Link`](/api/@dxos/client/classes/Link)`<Model<any, any>, any, any>, R>`

Arguments: 

`this`: [`Selection`](/api/@dxos/client/classes/Selection)`<`[`Item`](/api/@dxos/client/classes/Item)`<any>, R>`

`filter`: `LinkFilter`
### [`source`]()


Select sources of links in this selection.

Returns: [`Selection`](/api/@dxos/client/classes/Selection)`<`[`Item`](/api/@dxos/client/classes/Item)`<any>, R>`

Arguments: 

`this`: [`Selection`](/api/@dxos/client/classes/Selection)`<`[`Link`](/api/@dxos/client/classes/Link)`<Model<any, any>, any, any>, R>`

`filter`: `ItemFilter`
### [`target`]()


Select targets of links in this selection.

Returns: [`Selection`](/api/@dxos/client/classes/Selection)`<`[`Item`](/api/@dxos/client/classes/Item)`<any>, R>`

Arguments: 

`this`: [`Selection`](/api/@dxos/client/classes/Selection)`<`[`Link`](/api/@dxos/client/classes/Link)`<Model<any, any>, any, any>, R>`

`filter`: `ItemFilter`