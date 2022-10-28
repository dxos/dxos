# Class `Link`
> Declared in [`packages/core/echo/echo-db/dist/src/packlets/database/link.d.ts:15`]()


Link variant of an item. Link two objects together. Can hold a custom model.

## Constructors
### constructor
```ts
<M, L, R> (itemManager: ItemManager, itemId: string, itemType: undefined | string, stateManager: StateManager&lt;NonNullable&lt;M&gt;&gt;, link: LinkData) => [Link](/api/@dxos/client/classes/Link)&lt;M, L, R&gt;
```

## Properties
### _itemManager 
Type: ItemManager
### _onUpdate 
Type: Event&lt;[Entity](/api/@dxos/client/classes/Entity)&lt;any&gt;&gt;
### id
Type: string
### isLink
Type: "true"
### model
Type: M
### modelMeta
Type: ModelMeta&lt;any, any, any&gt;
### modelType
Type: string
### source
Type: [Item](/api/@dxos/client/classes/Item)&lt;L&gt;
### sourceId
Type: string
### target
Type: [Item](/api/@dxos/client/classes/Item)&lt;R&gt;
### targetId
Type: string
### type
Type: undefined | string

## Methods
### subscribe
```ts
(listener: function) => function
```
Subscribe for updates.