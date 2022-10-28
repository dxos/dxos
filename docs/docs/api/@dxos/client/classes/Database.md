# Class `Database`
> Declared in [`packages/core/echo/echo-db/dist/src/packlets/database/database.d.ts:33`]()


Represents a shared dataset containing queryable Items that are constructed from an ordered stream of mutations.

## Constructors
### constructor
```ts
(_modelFactory: ModelFactory, _backend: DatabaseBackend, memberKey: [PublicKey](/api/@dxos/client/classes/PublicKey)) => [Database](/api/@dxos/client/classes/Database)
```
Creates a new database instance.  `database.initialize()`  must be called afterwards to complete the initialization.

## Properties
### entityUpdate
Type: Event&lt;[Entity](/api/@dxos/client/classes/Entity)&lt;any&gt;&gt;

Fired immediately after any update in the entities.
If the information about which entity got updated is not required prefer using  `update` .
### isReadOnly
Type: boolean
### state
Type: State
### update
Type: Event&lt;[Entity](/api/@dxos/client/classes/Entity)&lt;any&gt;[]&gt;

Fired when any item is updated.
Contains a list of all entities changed from the last update.

## Methods
### createDataServiceHost
```ts
() => DataServiceHost
```
### createItem
```ts
<M> (options: CreateItemOption&lt;M&gt;) => Promise&lt;[Item](/api/@dxos/client/classes/Item)&lt;M&gt;&gt;
```
Creates a new item with the given queryable type and model.
### createLink
```ts
<M, S, T> (options: CreateLinkOptions&lt;M, S, T&gt;) => Promise&lt;[Link](/api/@dxos/client/classes/Link)&lt;M, S, T&gt;&gt;
```
### createSnapshot
```ts
() => DatabaseSnapshot
```
### destroy
```ts
() => Promise&lt;void&gt;
```
### getItem
```ts
(itemId: string) => undefined | [Item](/api/@dxos/client/classes/Item)&lt;any&gt;
```
Retrieves a item from the index.
### initialize
```ts
() => Promise&lt;void&gt;
```
### reduce
```ts
<R> (result: R, filter: RootFilter) => [Selection](/api/@dxos/client/classes/Selection)&lt;[Item](/api/@dxos/client/classes/Item)&lt;any&gt;, R&gt;
```
Returns a reducer selection context.
### select
```ts
(filter: RootFilter) => [Selection](/api/@dxos/client/classes/Selection)&lt;[Item](/api/@dxos/client/classes/Item)&lt;any&gt;, void&gt;
```
Returns a selection context, which can be used to traverse the object graph.
### waitForItem
```ts
<T> (filter: RootFilter) => Promise&lt;[Item](/api/@dxos/client/classes/Item)&lt;T&gt;&gt;
```
Waits for item matching the filter to be present and returns it.