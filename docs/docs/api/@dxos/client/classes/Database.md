# Class `Database`
> Declared in [`packages/core/echo/echo-db/dist/src/packlets/database/database.d.ts:33`]()


Represents a shared dataset containing queryable Items that are constructed from an ordered stream of mutations.

## Constructors
### constructor
```ts
(_modelFactory: ModelFactory, _backend: DatabaseBackend, memberKey: PublicKey) => Database
```
Creates a new database instance.  `database.initialize()`  must be called afterwards to complete the initialization.

## Properties
### entityUpdate
> Type: `Event<Entity<any>>`
<br/>

Fired immediately after any update in the entities.
If the information about which entity got updated is not required prefer using  `update` .
### isReadOnly
> Type: `boolean`
<br/>
### state
> Type: `State`
<br/>
### update
> Type: `Event<Entity<any>[]>`
<br/>

Fired when any item is updated.
Contains a list of all entities changed from the last update.

## Methods
### createDataServiceHost
```ts
() => DataServiceHost
```
### createItem
```ts
<M> (options: CreateItemOption<M>) => Promise<Item<M>>
```
Creates a new item with the given queryable type and model.
### createLink
```ts
<M, S, T> (options: CreateLinkOptions<M, S, T>) => Promise<Link<M, S, T>>
```
### createSnapshot
```ts
() => DatabaseSnapshot
```
### destroy
```ts
() => Promise<void>
```
### getItem
```ts
(itemId: string) => undefined | Item<any>
```
Retrieves a item from the index.
### initialize
```ts
() => Promise<void>
```
### reduce
```ts
<R> (result: R, filter: RootFilter) => Selection<Item<any>, R>
```
Returns a reducer selection context.
### select
```ts
(filter: RootFilter) => Selection<Item<any>, void>
```
Returns a selection context, which can be used to traverse the object graph.
### waitForItem
```ts
<T> (filter: RootFilter) => Promise<Item<T>>
```
Waits for item matching the filter to be present and returns it.