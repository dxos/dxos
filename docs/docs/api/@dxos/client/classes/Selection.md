# Class `Selection`
> Declared in [`packages/core/echo/echo-db/dist/src/packlets/database/selection/selection.d.ts`]()

Selections are used to construct database subscriptions.
They are [monads](https://www.quora.com/What-are-monads-in-computer-science) that support
the functional composition of predicates to traverse the graph.
Additionally, selections may be used to create reducers that compute an aggregated value over the traversal.

Implementation:
Each Selection contains a visitor

## Constructors
```ts
new Selection <T, R> (_visitor: function, _update: Event<Entity<Model<any, any>>[]>, _root: SelectionRoot, _reducer: boolean) => Selection<T, R>
```

## Properties


## Functions
```ts
call (visitor: Callable<T, R>) => Selection<T, R>
```
Visitor.
```ts
children (this: Selection<Item<any>, R>, filter: ItemFilter) => Selection<Item<any>, R>
```
Select children of the items in this selection.
```ts
exec (options: QueryOptions) => SelectionResult<T, R>
```
Finish the selection and return the result.
```ts
filter (this: Selection<Item<any>, R>, filter: ItemFilter) => Selection<Item<any>, R>
```
Filter entities of this selection.
```ts
filter <U> (this: Selection<U, R>, filter: Predicate<U>) => Selection<U, R>
```
```ts
links (this: Selection<Item<any>, R>, filter: LinkFilter) => Selection<Link<Model<any, any>, any, any>, R>
```
Select links sourcing from the items in this selection.
```ts
parent (this: Selection<Item<any>, R>) => Selection<Item<any>, R>
```
Select parent of the items in this selection.
```ts
query (options: QueryOptions) => SelectionResult<T, R>
```
```ts
refs (this: Selection<Item<any>, R>, filter: LinkFilter) => Selection<Link<Model<any, any>, any, any>, R>
```
Select links pointing to items in this selection.
```ts
source (this: Selection<Link<Model<any, any>, any, any>, R>, filter: ItemFilter) => Selection<Item<any>, R>
```
Select sources of links in this selection.
```ts
target (this: Selection<Link<Model<any, any>, any, any>, R>, filter: ItemFilter) => Selection<Item<any>, R>
```
Select targets of links in this selection.