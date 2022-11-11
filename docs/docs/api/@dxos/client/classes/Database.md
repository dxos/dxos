# Class `Database`
Declared in [`packages/core/echo/echo-db/dist/src/packlets/database/database.d.ts:33`]()


Represents a shared dataset containing queryable Items that are constructed from an ordered stream of mutations.

## Constructors
### [`constructor`]()


Creates a new database instance.  `database.initialize()`  must be called afterwards to complete the initialization.

Returns: [`Database`](/api/@dxos/client/classes/Database)

Arguments: 

`_modelFactory`: `ModelFactory`

`_backend`: `DatabaseBackend`

`memberKey`: [`PublicKey`](/api/@dxos/client/classes/PublicKey)

## Properties
### [`entityUpdate`]()
Type: `Event<`[`Entity`](/api/@dxos/client/classes/Entity)`<any>>`

Fired immediately after any update in the entities.
If the information about which entity got updated is not required prefer using  `update` .
### [`isReadOnly`]()
Type: `boolean`
### [`state`]()
Type: `State`
### [`update`]()
Type: `Event<`[`Entity`](/api/@dxos/client/classes/Entity)`<any>[]>`

Fired when any item is updated.
Contains a list of all entities changed from the last update.

## Methods
### [`createDataServiceHost`]()


Returns: `DataServiceHost`

Arguments: none
### [`createItem`]()


Creates a new item with the given queryable type and model.

Returns: `Promise<`[`Item`](/api/@dxos/client/classes/Item)`<M>>`

Arguments: 

`options`: `CreateItemOption<M>`
### [`createLink`]()


Returns: `Promise<`[`Link`](/api/@dxos/client/classes/Link)`<M, S, T>>`

Arguments: 

`options`: `CreateLinkOptions<M, S, T>`
### [`createSnapshot`]()


Returns: `DatabaseSnapshot`

Arguments: none
### [`destroy`]()


Returns: `Promise<void>`

Arguments: none
### [`getItem`]()


Retrieves a item from the index.

Returns: `undefined | `[`Item`](/api/@dxos/client/classes/Item)`<any>`

Arguments: 

`itemId`: `string`
### [`initialize`]()


Returns: `Promise<void>`

Arguments: none
### [`reduce`]()


Returns a reducer selection context.

Returns: [`Selection`](/api/@dxos/client/classes/Selection)`<`[`Item`](/api/@dxos/client/classes/Item)`<any>, R>`

Arguments: 

`result`: `R`

`filter`: `RootFilter`
### [`select`]()


Returns a selection context, which can be used to traverse the object graph.

Returns: [`Selection`](/api/@dxos/client/classes/Selection)`<`[`Item`](/api/@dxos/client/classes/Item)`<any>, void>`

Arguments: 

`filter`: `RootFilter`
### [`waitForItem`]()


Waits for item matching the filter to be present and returns it.

Returns: `Promise<`[`Item`](/api/@dxos/client/classes/Item)`<T>>`

Arguments: 

`filter`: `RootFilter`