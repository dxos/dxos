# Class `Link`
Declared in [`packages/core/echo/echo-db/dist/src/packlets/database/link.d.ts:15`]()


Link variant of an item. Link two objects together. Can hold a custom model.

## Constructors
### [`constructor`]()


Returns: [`Link`](/api/@dxos/client/classes/Link)`<M, L, R>`

Arguments: 

`itemManager`: `ItemManager`

`itemId`: `string`

`itemType`: `undefined | string`

`stateManager`: `StateManager<NonNullable<M>>`

`link`: `LinkData`

## Properties
### [`_itemManager`]()
Type: `ItemManager`
### [`_onUpdate`]()
Type: `Event<`[`Entity`](/api/@dxos/client/classes/Entity)`<any>>`
### [`id`]()
Type: `string`
### [`isLink`]()
Type: `"true"`
### [`model`]()
Type: `M`
### [`modelMeta`]()
Type: `ModelMeta<any, any, any>`
### [`modelType`]()
Type: `string`
### [`source`]()
Type: [`Item`](/api/@dxos/client/classes/Item)`<L>`
### [`sourceId`]()
Type: `string`
### [`target`]()
Type: [`Item`](/api/@dxos/client/classes/Item)`<R>`
### [`targetId`]()
Type: `string`
### [`type`]()
Type: `undefined | string`

## Methods
### [`subscribe`]()


Subscribe for updates.

Returns: `UnsubscribeCallback`

Arguments: 

`listener`: `function`