# Class `Link`
> Declared in [`packages/core/echo/echo-db/dist/src/packlets/database/link.d.ts:15`]()


Link variant of an item. Link two objects together. Can hold a custom model.

## Constructors
### constructor
```ts
<M, L, R> (itemManager: ItemManager, itemId: string, itemType: undefined | string, stateManager: StateManager<NonNullable<M>>, link: LinkData) => Link<M, L, R>
```

## Properties
### _itemManager 
> Type: `ItemManager`
<br/>
### _onUpdate 
> Type: `Event<Entity<any>>`
<br/>
### id
> Type: `string`
<br/>
### isLink
> Type: `"true"`
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
### source
> Type: `Item<L>`
<br/>
### sourceId
> Type: `string`
<br/>
### target
> Type: `Item<R>`
<br/>
### targetId
> Type: `string`
<br/>
### type
> Type: `undefined | string`
<br/>

## Methods
### subscribe
```ts
(listener: function) => function
```
Subscribe for updates.