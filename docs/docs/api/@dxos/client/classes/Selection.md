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
<T, R> (_visitor: function, _update: Event<[Entity](/api/@dxos/client/classes/Entity)<Model<any, any>>[]>, _root: SelectionRoot, _reducer: boolean) => [Selection](/api/@dxos/client/classes/Selection)<T, R>
```

## Properties
### root
Type: SelectionRoot

The root of the selection. Either a database or an item. Must be a stable reference.

## Methods
### call
```ts
(visitor: Callable<T, R>) => [Selection](/api/@dxos/client/classes/Selection)<T, R>
```
Visitor.
### children
```ts
(this: [Selection](/api/@dxos/client/classes/Selection)<[Item](/api/@dxos/client/classes/Item)<any>, R>, filter: ItemFilter) => [Selection](/api/@dxos/client/classes/Selection)<[Item](/api/@dxos/client/classes/Item)<any>, R>
```
Select children of the items in this selection.
### exec
```ts
(options: QueryOptions) => [SelectionResult](/api/@dxos/client/classes/SelectionResult)<T, R>
```
Finish the selection and return the result.
### filter
```ts
(this: [Selection](/api/@dxos/client/classes/Selection)<[Item](/api/@dxos/client/classes/Item)<any>, R>, filter: ItemFilter) => [Selection](/api/@dxos/client/classes/Selection)<[Item](/api/@dxos/client/classes/Item)<any>, R>
```
Filter entities of this selection.
```ts
<U> (this: [Selection](/api/@dxos/client/classes/Selection)<U, R>, filter: Predicate<U>) => [Selection](/api/@dxos/client/classes/Selection)<U, R>
```
### links
```ts
(this: [Selection](/api/@dxos/client/classes/Selection)<[Item](/api/@dxos/client/classes/Item)<any>, R>, filter: LinkFilter) => [Selection](/api/@dxos/client/classes/Selection)<[Link](/api/@dxos/client/classes/Link)<Model<any, any>, any, any>, R>
```
Select links sourcing from the items in this selection.
### parent
```ts
(this: [Selection](/api/@dxos/client/classes/Selection)<[Item](/api/@dxos/client/classes/Item)<any>, R>) => [Selection](/api/@dxos/client/classes/Selection)<[Item](/api/@dxos/client/classes/Item)<any>, R>
```
Select parent of the items in this selection.
### query
```ts
(options: QueryOptions) => [SelectionResult](/api/@dxos/client/classes/SelectionResult)<T, R>
```
### refs
```ts
(this: [Selection](/api/@dxos/client/classes/Selection)<[Item](/api/@dxos/client/classes/Item)<any>, R>, filter: LinkFilter) => [Selection](/api/@dxos/client/classes/Selection)<[Link](/api/@dxos/client/classes/Link)<Model<any, any>, any, any>, R>
```
Select links pointing to items in this selection.
### source
```ts
(this: [Selection](/api/@dxos/client/classes/Selection)<[Link](/api/@dxos/client/classes/Link)<Model<any, any>, any, any>, R>, filter: ItemFilter) => [Selection](/api/@dxos/client/classes/Selection)<[Item](/api/@dxos/client/classes/Item)<any>, R>
```
Select sources of links in this selection.
### target
```ts
(this: [Selection](/api/@dxos/client/classes/Selection)<[Link](/api/@dxos/client/classes/Link)<Model<any, any>, any, any>, R>, filter: ItemFilter) => [Selection](/api/@dxos/client/classes/Selection)<[Item](/api/@dxos/client/classes/Item)<any>, R>
```
Select targets of links in this selection.