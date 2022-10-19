# Class `Item`
> Declared in [`packages/core/echo/echo-db/dist/src/packlets/database/item.d.ts:14`]()


A globally addressable data item.
Items are hermetic data structures contained within a Party. They may be hierarchical.
The Item data structure is governed by a Model class, which implements data consistency.

## Constructors
```ts
new Item <M> (itemManager: ItemManager, itemId: string, itemType: undefined | string, stateManager: StateManager<NonNullable<M>>, _writeStream: FeedWriter<EchoEnvelope>, parent: "null" | Item<any>) => Item<M>
```
Items are constructed by the  `Database`  object.

## Properties
### `_itemManager: ItemManager`
### `_onUpdate: Event<Entity<any>>`
### `children:  get Item<any>[]`
### `deleted:  get boolean`
### `id:  get string`
### `links:  get Link<any, any, any>[]`
### `model:  get M`
### `modelMeta:  get ModelMeta<any, any, any>`
### `modelType:  get string`
### `parent:  get "null" | Item<any>`
### `readOnly:  get boolean`
### `refs:  get Link<any, any, any>[]`
### `type:  get undefined | string`

## Functions
```ts
delete () => Promise<void>
```
Delete the item.
```ts
restore () => Promise<void>
```
Restore deleted item.
```ts
select () => Selection<Item<any>, void>
```
Returns a selection context, which can be used to traverse the object graph starting from this item.
```ts
setParent (parentId: string) => Promise<void>
```
```ts
subscribe (listener: function) => function
```
Subscribe for updates.
```ts
toString () => string
```