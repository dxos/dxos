# Class `Selection`
<sub>Declared in [packages/core/echo/echo-db/dist/types/src/packlets/database/selection/selection.d.ts:32]()</sub>


Selections are used to construct database subscriptions.
They are [monads](https://www.quora.com/What-are-monads-in-computer-science) that support
the functional composition of predicates to traverse the graph.
Additionally, selections may be used to create reducers that compute an aggregated value over the traversal.

Implementation:
Each Selection contains a visitor

## Constructors
### [constructor(_visitor, _update, _root, \[_reducer\])]()


Returns: <code>[Selection](/api/@dxos/client/classes/Selection)&lt;T, R&gt;</code>

Arguments: 

`_visitor`: <code>function</code>

`_update`: <code>Event&lt;[Entity](/api/@dxos/client/classes/Entity)&lt;Model&lt;any, any&gt;&gt;[]&gt;</code>

`_root`: <code>SelectionRoot</code>

`_reducer`: <code>boolean</code>

## Properties
### [root]()
Type: <code>SelectionRoot</code>

The root of the selection. Either a database or an item. Must be a stable reference.

## Methods
### [call(visitor)]()


Visitor.

Returns: <code>[Selection](/api/@dxos/client/classes/Selection)&lt;T, R&gt;</code>

Arguments: 

`visitor`: <code>Callable&lt;T, R&gt;</code>
### [children(this, \[filter\])]()


Select children of the items in this selection.

Returns: <code>[Selection](/api/@dxos/client/classes/Selection)&lt;[Item](/api/@dxos/client/classes/Item)&lt;any&gt;, R&gt;</code>

Arguments: 

`this`: <code>[Selection](/api/@dxos/client/classes/Selection)&lt;[Item](/api/@dxos/client/classes/Item)&lt;any&gt;, R&gt;</code>

`filter`: <code>ItemFilter</code>
### [exec(\[options\])]()


Finish the selection and return the result.

Returns: <code>[SelectionResult](/api/@dxos/client/classes/SelectionResult)&lt;T, R&gt;</code>

Arguments: 

`options`: <code>QueryOptions</code>
### [filter(this, filter)]()


Filter entities of this selection.

Returns: <code>[Selection](/api/@dxos/client/classes/Selection)&lt;[Item](/api/@dxos/client/classes/Item)&lt;any&gt;, R&gt;</code>

Arguments: 

`this`: <code>[Selection](/api/@dxos/client/classes/Selection)&lt;[Item](/api/@dxos/client/classes/Item)&lt;any&gt;, R&gt;</code>

`filter`: <code>ItemFilter</code>
Returns: <code>[Selection](/api/@dxos/client/classes/Selection)&lt;U, R&gt;</code>

Arguments: 

`this`: <code>[Selection](/api/@dxos/client/classes/Selection)&lt;U, R&gt;</code>

`filter`: <code>Predicate&lt;U&gt;</code>
### [links(this, \[filter\])]()


Select links sourcing from the items in this selection.

Returns: <code>[Selection](/api/@dxos/client/classes/Selection)&lt;[Link](/api/@dxos/client/classes/Link)&lt;Model&lt;any, any&gt;, any, any&gt;, R&gt;</code>

Arguments: 

`this`: <code>[Selection](/api/@dxos/client/classes/Selection)&lt;[Item](/api/@dxos/client/classes/Item)&lt;any&gt;, R&gt;</code>

`filter`: <code>LinkFilter</code>
### [parent(this)]()


Select parent of the items in this selection.

Returns: <code>[Selection](/api/@dxos/client/classes/Selection)&lt;[Item](/api/@dxos/client/classes/Item)&lt;any&gt;, R&gt;</code>

Arguments: 

`this`: <code>[Selection](/api/@dxos/client/classes/Selection)&lt;[Item](/api/@dxos/client/classes/Item)&lt;any&gt;, R&gt;</code>
### [query(\[options\])]()


Returns: <code>[SelectionResult](/api/@dxos/client/classes/SelectionResult)&lt;T, R&gt;</code>

Arguments: 

`options`: <code>QueryOptions</code>
### [refs(this, \[filter\])]()


Select links pointing to items in this selection.

Returns: <code>[Selection](/api/@dxos/client/classes/Selection)&lt;[Link](/api/@dxos/client/classes/Link)&lt;Model&lt;any, any&gt;, any, any&gt;, R&gt;</code>

Arguments: 

`this`: <code>[Selection](/api/@dxos/client/classes/Selection)&lt;[Item](/api/@dxos/client/classes/Item)&lt;any&gt;, R&gt;</code>

`filter`: <code>LinkFilter</code>
### [source(this, \[filter\])]()


Select sources of links in this selection.

Returns: <code>[Selection](/api/@dxos/client/classes/Selection)&lt;[Item](/api/@dxos/client/classes/Item)&lt;any&gt;, R&gt;</code>

Arguments: 

`this`: <code>[Selection](/api/@dxos/client/classes/Selection)&lt;[Link](/api/@dxos/client/classes/Link)&lt;Model&lt;any, any&gt;, any, any&gt;, R&gt;</code>

`filter`: <code>ItemFilter</code>
### [target(this, \[filter\])]()


Select targets of links in this selection.

Returns: <code>[Selection](/api/@dxos/client/classes/Selection)&lt;[Item](/api/@dxos/client/classes/Item)&lt;any&gt;, R&gt;</code>

Arguments: 

`this`: <code>[Selection](/api/@dxos/client/classes/Selection)&lt;[Link](/api/@dxos/client/classes/Link)&lt;Model&lt;any, any&gt;, any, any&gt;, R&gt;</code>

`filter`: <code>ItemFilter</code>