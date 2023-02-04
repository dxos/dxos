# Class `Item`
<sub>Declared in [packages/core/echo/echo-db/dist/types/src/packlets/database/item.d.ts:15]()</sub>


A globally addressable data item.
Items are hermetic data structures contained within a Space. They may be hierarchical.
The Item data structure is governed by a Model class, which implements data consistency.

## Constructors
### [constructor(itemManager, itemId, itemType, stateManager, \[_writeStream\], \[parent\])]()


Items are constructed by the  `Database`  object.

Returns: <code>[Item](/api/@dxos/react-client/classes/Item)&lt;M&gt;</code>

Arguments: 

`itemManager`: <code>ItemManager</code>

`itemId`: <code>string</code>

`itemType`: <code>undefined | string</code>

`stateManager`: <code>StateManager&lt;NonNullable&lt;M&gt;&gt;</code>

`_writeStream`: <code>FeedWriter&lt;DataMessage&gt;</code>

`parent`: <code>"null" | [Item](/api/@dxos/react-client/classes/Item)&lt;any&gt;</code>

## Properties
### [_itemManager]()
Type: <code>ItemManager</code>
### [_onUpdate]()
Type: <code>Event&lt;[Entity](/api/@dxos/react-client/classes/Entity)&lt;any&gt;&gt;</code>
### [children]()
Type: <code>[Item](/api/@dxos/react-client/classes/Item)&lt;any&gt;[]</code>
### [deleted]()
Type: <code>boolean</code>
### [id]()
Type: <code>string</code>
### [links]()
Type: <code>[Link](/api/@dxos/react-client/classes/Link)&lt;any, any, any&gt;[]</code>
### [model]()
Type: <code>M</code>
### [modelMeta]()
Type: <code>ModelMeta&lt;any, any, any&gt;</code>
### [modelType]()
Type: <code>string</code>
### [parent]()
Type: <code>"null" | [Item](/api/@dxos/react-client/classes/Item)&lt;any&gt;</code>
### [readOnly]()
Type: <code>boolean</code>
### [refs]()
Type: <code>[Link](/api/@dxos/react-client/classes/Link)&lt;any, any, any&gt;[]</code>
### [type]()
Type: <code>undefined | string</code>

## Methods
### [delete()]()


Delete the item.

Returns: <code>Promise&lt;void&gt;</code>

Arguments: none
### [restore()]()


Restore deleted item.

Returns: <code>Promise&lt;void&gt;</code>

Arguments: none
### [select()]()


Returns a selection context, which can be used to traverse the object graph starting from this item.

Returns: <code>[Selection](/api/@dxos/react-client/classes/Selection)&lt;[Item](/api/@dxos/react-client/classes/Item)&lt;any&gt;, void&gt;</code>

Arguments: none
### [setParent(parentId)]()


Returns: <code>Promise&lt;void&gt;</code>

Arguments: 

`parentId`: <code>string</code>
### [subscribe(listener)]()


Subscribe for updates.

Returns: <code>UnsubscribeCallback</code>

Arguments: 

`listener`: <code>function</code>
### [toString()]()


Returns: <code>string</code>

Arguments: none