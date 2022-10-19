# Class `Database`
> Declared in [`packages/core/echo/echo-db/dist/src/packlets/database/database.d.ts:33`]()


Represents a shared dataset containing queryable Items that are constructed from an ordered stream of mutations.

## Constructors
```ts
new Database (_modelFactory: ModelFactory, _backend: DatabaseBackend, memberKey: PublicKey) => Database
```
Creates a new database instance.  `database.initialize()`  must be called afterwards to complete the initialization.

## Properties
### `entityUpdate:  get Event<Entity<any>>`
Fired immediately after any update in the entities.
If the information about which entity got updated is not required prefer using  `update` .
### `isReadOnly:  get boolean`
### `state:  get State`
### `update:  get Event<Entity<any>[]>`
Fired when any item is updated.
Contains a list of all entities changed from the last update.

## Functions
```ts
createDataServiceHost () => DataServiceHost
```
```ts
createItem <M> (options: CreateItemOption<M>) => Promise<Item<M>>
```
Creates a new item with the given queryable type and model.
```ts
createLink <M, S, T> (options: CreateLinkOptions<M, S, T>) => Promise<Link<M, S, T>>
```
```ts
createSnapshot () => DatabaseSnapshot
```
```ts
destroy () => Promise<void>
```
```ts
getItem (itemId: string) => undefined | Item<any>
```
Retrieves a item from the index.
```ts
initialize () => Promise<void>
```
```ts
reduce <R> (result: R, filter: RootFilter) => Selection<Item<any>, R>
```
Returns a reducer selection context.
```ts
select (filter: RootFilter) => Selection<Item<any>, void>
```
Returns a selection context, which can be used to traverse the object graph.
```ts
waitForItem <T> (filter: RootFilter) => Promise<Item<T>>
```
Waits for item matching the filter to be present and returns it.