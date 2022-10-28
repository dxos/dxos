# Class `Selection`
> Declared in [`packages/core/echo/echo-db/dist/src/packlets/database/selection/selection.d.ts:32`]()


Selections are used to construct database subscriptions.
They are [monads](https://www.quora.com/What-are-monads-in-computer-science) that support
the functional composition of predicates to traverse the graph.
Additionally, selections may be used to create reducers that compute an aggregated value over the traversal.

Implementation:
Each Selection contains a visitor

## Constructors
### constructor
```ts
<T, R> (_visitor: function, _update: Event&lt;[Entity](/api/@dxos/client/classes/Entity)&lt;Model&lt;any, any&gt;&gt;[]&gt;, _root: SelectionRoot, _reducer: boolean) => [Selection](/api/@dxos/client/classes/Selection)&lt;T, R&gt;
```

## Properties
### root
Type: SelectionRoot

The root of the selection. Either a database or an item. Must be a stable reference.

## Methods
### call
```ts
(visitor: Callable&lt;T, R&gt;) => [Selection](/api/@dxos/client/classes/Selection)&lt;T, R&gt;
```
Visitor.
### children
```ts
(this: [Selection](/api/@dxos/client/classes/Selection)&lt;[Item](/api/@dxos/client/classes/Item)&lt;any&gt;, R&gt;, filter: ItemFilter) => [Selection](/api/@dxos/client/classes/Selection)&lt;[Item](/api/@dxos/client/classes/Item)&lt;any&gt;, R&gt;
```
Select children of the items in this selection.
### exec
```ts
(options: QueryOptions) => [SelectionResult](/api/@dxos/client/classes/SelectionResult)&lt;T, R&gt;
```
Finish the selection and return the result.
### filter
```ts
(this: [Selection](/api/@dxos/client/classes/Selection)&lt;[Item](/api/@dxos/client/classes/Item)&lt;any&gt;, R&gt;, filter: ItemFilter) => [Selection](/api/@dxos/client/classes/Selection)&lt;[Item](/api/@dxos/client/classes/Item)&lt;any&gt;, R&gt;
```
Filter entities of this selection.
```ts
<U> (this: [Selection](/api/@dxos/client/classes/Selection)&lt;U, R&gt;, filter: Predicate&lt;U&gt;) => [Selection](/api/@dxos/client/classes/Selection)&lt;U, R&gt;
```
### links
```ts
(this: [Selection](/api/@dxos/client/classes/Selection)&lt;[Item](/api/@dxos/client/classes/Item)&lt;any&gt;, R&gt;, filter: LinkFilter) => [Selection](/api/@dxos/client/classes/Selection)&lt;[Link](/api/@dxos/client/classes/Link)&lt;Model&lt;any, any&gt;, any, any&gt;, R&gt;
```
Select links sourcing from the items in this selection.
### parent
```ts
(this: [Selection](/api/@dxos/client/classes/Selection)&lt;[Item](/api/@dxos/client/classes/Item)&lt;any&gt;, R&gt;) => [Selection](/api/@dxos/client/classes/Selection)&lt;[Item](/api/@dxos/client/classes/Item)&lt;any&gt;, R&gt;
```
Select parent of the items in this selection.
### query
```ts
(options: QueryOptions) => [SelectionResult](/api/@dxos/client/classes/SelectionResult)&lt;T, R&gt;
```
### refs
```ts
(this: [Selection](/api/@dxos/client/classes/Selection)&lt;[Item](/api/@dxos/client/classes/Item)&lt;any&gt;, R&gt;, filter: LinkFilter) => [Selection](/api/@dxos/client/classes/Selection)&lt;[Link](/api/@dxos/client/classes/Link)&lt;Model&lt;any, any&gt;, any, any&gt;, R&gt;
```
Select links pointing to items in this selection.
### source
```ts
(this: [Selection](/api/@dxos/client/classes/Selection)&lt;[Link](/api/@dxos/client/classes/Link)&lt;Model&lt;any, any&gt;, any, any&gt;, R&gt;, filter: ItemFilter) => [Selection](/api/@dxos/client/classes/Selection)&lt;[Item](/api/@dxos/client/classes/Item)&lt;any&gt;, R&gt;
```
Select sources of links in this selection.
### target
```ts
(this: [Selection](/api/@dxos/client/classes/Selection)&lt;[Link](/api/@dxos/client/classes/Link)&lt;Model&lt;any, any&gt;, any, any&gt;, R&gt;, filter: ItemFilter) => [Selection](/api/@dxos/client/classes/Selection)&lt;[Item](/api/@dxos/client/classes/Item)&lt;any&gt;, R&gt;
```
Select targets of links in this selection.