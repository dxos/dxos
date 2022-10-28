# Class `Item`
> Declared in [`packages/core/echo/echo-db/dist/src/packlets/database/item.d.ts:14`]()


A globally addressable data item.
Items are hermetic data structures contained within a Party. They may be hierarchical.
The Item data structure is governed by a Model class, which implements data consistency.

## Constructors
### constructor
```ts
<M> (itemManager: ItemManager, itemId: string, itemType: undefined | string, stateManager: StateManager&lt;NonNullable&lt;M&gt;&gt;, _writeStream: FeedWriter&lt;EchoEnvelope&gt;, parent: "null" | [Item](/api/@dxos/client/classes/Item)&lt;any&gt;) => [Item](/api/@dxos/client/classes/Item)&lt;M&gt;
```
Items are constructed by the  `Database`  object.

## Properties
### _itemManager 
Type: ItemManager
### _onUpdate 
Type: Event&lt;[Entity](/api/@dxos/client/classes/Entity)&lt;any&gt;&gt;
### children
Type: [Item](/api/@dxos/client/classes/Item)&lt;any&gt;[]
### deleted
Type: boolean
### id
Type: string
### links
Type: [Link](/api/@dxos/client/classes/Link)&lt;any, any, any&gt;[]
### model
Type: M
### modelMeta
Type: ModelMeta&lt;any, any, any&gt;
### modelType
Type: string
### parent
Type: "null" | [Item](/api/@dxos/client/classes/Item)&lt;any&gt;
### readOnly
Type: boolean
### refs
Type: [Link](/api/@dxos/client/classes/Link)&lt;any, any, any&gt;[]
### type
Type: undefined | string

## Methods
### delete
```ts
() => Promise&lt;void&gt;
```
Delete the item.
### restore
```ts
() => Promise&lt;void&gt;
```
Restore deleted item.
### select
```ts
() => [Selection](/api/@dxos/client/classes/Selection)&lt;[Item](/api/@dxos/client/classes/Item)&lt;any&gt;, void&gt;
```
Returns a selection context, which can be used to traverse the object graph starting from this item.
### setParent
```ts
(parentId: string) => Promise&lt;void&gt;
```
### subscribe
```ts
(listener: function) => function
```
Subscribe for updates.
### toString
```ts
() => string
```