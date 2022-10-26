# Class `Item`
> Declared in [`packages/core/echo/echo-db/dist/src/packlets/database/item.d.ts:14`]()


A globally addressable data item.
Items are hermetic data structures contained within a Party. They may be hierarchical.
The Item data structure is governed by a Model class, which implements data consistency.

## Constructors
### constructor
```ts
<M> (itemManager: ItemManager, itemId: string, itemType: undefined | string, stateManager: StateManager<NonNullable<M>>, _writeStream: FeedWriter<EchoEnvelope>, parent: "null" | Item<any>) => Item<M>
```
Items are constructed by the  `Database`  object.

## Properties
### _itemManager 
> Type: `ItemManager`
<br/>
### _onUpdate 
> Type: `Event<Entity<any>>`
<br/>
### children
> Type: `Item<any>[]`
<br/>
### deleted
> Type: `boolean`
<br/>
### id
> Type: `string`
<br/>
### links
> Type: `Link<any, any, any>[]`
<br/>
### model
> Type: `M`
<br/>
### modelMeta
> Type: `ModelMeta<any, any, any>`
<br/>
### modelType
> Type: `string`
<br/>
### parent
> Type: `"null" | Item<any>`
<br/>
### readOnly
> Type: `boolean`
<br/>
### refs
> Type: `Link<any, any, any>[]`
<br/>
### type
> Type: `undefined | string`
<br/>

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
() => Selection<Item<any>, void>
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