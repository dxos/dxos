# Class `Item`
> Declared in [`packages/core/echo/echo-db/dist/src/packlets/database/item.d.ts:14`]()


A globally addressable data item.
Items are hermetic data structures contained within a Party. They may be hierarchical.
The Item data structure is governed by a Model class, which implements data consistency.

## Constructors
### constructor
```ts
<M> (itemManager: ItemManager, itemId: string, itemType: undefined | string, stateManager: StateManager<NonNullable<M>>, _writeStream: FeedWriter<EchoEnvelope>, parent: "null" | [Item](/api/@dxos/client/classes/Item)<any>) => [Item](/api/@dxos/client/classes/Item)<M>
```
Items are constructed by the  `Database`  object.

## Properties
### _itemManager 
Type: ItemManager
### _onUpdate 
Type: Event<[Entity](/api/@dxos/client/classes/Entity)<any>>
### children
Type: [Item](/api/@dxos/client/classes/Item)<any>[]
### deleted
Type: boolean
### id
Type: string
### links
Type: [Link](/api/@dxos/client/classes/Link)<any, any, any>[]
### model
Type: M
### modelMeta
Type: ModelMeta<any, any, any>
### modelType
Type: string
### parent
Type: "null" | [Item](/api/@dxos/client/classes/Item)<any>
### readOnly
Type: boolean
### refs
Type: [Link](/api/@dxos/client/classes/Link)<any, any, any>[]
### type
Type: undefined | string

## Methods
### delete
```ts
() => Promise<void>
```
Delete the item.
### restore
```ts
() => Promise<void>
```
Restore deleted item.
### select
```ts
() => [Selection](/api/@dxos/client/classes/Selection)<[Item](/api/@dxos/client/classes/Item)<any>, void>
```
Returns a selection context, which can be used to traverse the object graph starting from this item.
### setParent
```ts
(parentId: string) => Promise<void>
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