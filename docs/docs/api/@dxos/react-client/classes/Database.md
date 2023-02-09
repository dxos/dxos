# Class `Database`
<sub>Declared in [packages/core/echo/echo-db/dist/types/src/packlets/database/database.d.ts:34]()</sub>


Represents a shared dataset containing queryable Items that are constructed from an ordered stream of mutations.

## Constructors
### [constructor(_modelFactory, _backend, memberKey)]()


Creates a new database instance.  `database.initialize()`  must be called afterwards to complete the initialization.

Returns: <code>[Database](/api/@dxos/react-client/classes/Database)</code>

Arguments: 

`_modelFactory`: <code>ModelFactory</code>

`_backend`: <code>DatabaseBackend</code>

`memberKey`: <code>[PublicKey](/api/@dxos/react-client/classes/PublicKey)</code>

## Properties
### [entityUpdate]()
Type: <code>Event&lt;[Entity](/api/@dxos/react-client/classes/Entity)&lt;any&gt;&gt;</code>

Fired immediately after any update in the entities.
If the information about which entity got updated is not required prefer using  `update` .
### [isReadOnly]()
Type: <code>boolean</code>
### [state]()
Type: <code>State</code>
### [update]()
Type: <code>Event&lt;[Entity](/api/@dxos/react-client/classes/Entity)&lt;any&gt;[]&gt;</code>

Fired when any item is updated.
Contains a list of all entities changed from the last update.

## Methods
### [createDataServiceHost()]()


Returns: <code>DataServiceHost</code>

Arguments: none
### [createItem(\[options\])]()


Creates a new item with the given queryable type and model.

Returns: <code>Promise&lt;[Item](/api/@dxos/react-client/classes/Item)&lt;M&gt;&gt;</code>

Arguments: 

`options`: <code>CreateItemOption&lt;M&gt;</code>
### [createLink(options)]()


Returns: <code>Promise&lt;[Link](/api/@dxos/react-client/classes/Link)&lt;M, S, T&gt;&gt;</code>

Arguments: 

`options`: <code>CreateLinkOptions&lt;M, S, T&gt;</code>
### [createSnapshot()]()


Returns: <code>DatabaseSnapshot</code>

Arguments: none
### [destroy()]()


Returns: <code>Promise&lt;void&gt;</code>

Arguments: none
### [getItem(itemId)]()


Retrieves a item from the index.

Returns: <code>undefined | [Item](/api/@dxos/react-client/classes/Item)&lt;any&gt;</code>

Arguments: 

`itemId`: <code>string</code>
### [initialize()]()


Returns: <code>Promise&lt;void&gt;</code>

Arguments: none
### [reduce(result, \[filter\])]()


Returns a reducer selection context.

Returns: <code>[Selection](/api/@dxos/react-client/classes/Selection)&lt;[Item](/api/@dxos/react-client/classes/Item)&lt;any&gt;, R&gt;</code>

Arguments: 

`result`: <code>R</code>

`filter`: <code>RootFilter</code>
### [select(\[filter\])]()


Returns a selection context, which can be used to traverse the object graph.

Returns: <code>[Selection](/api/@dxos/react-client/classes/Selection)&lt;[Item](/api/@dxos/react-client/classes/Item)&lt;any&gt;, void&gt;</code>

Arguments: 

`filter`: <code>RootFilter</code>
### [waitForItem(filter)]()


Waits for item matching the filter to be present and returns it.

Returns: <code>Promise&lt;[Item](/api/@dxos/react-client/classes/Item)&lt;T&gt;&gt;</code>

Arguments: 

`filter`: <code>RootFilter</code>