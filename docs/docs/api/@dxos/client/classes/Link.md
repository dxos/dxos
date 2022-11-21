# Class `Link`
<sub>Declared in [packages/core/echo/echo-db/dist/src/packlets/database/link.d.ts:15]()</sub>


Link variant of an item. Link two objects together. Can hold a custom model.

## Constructors
### [constructor(itemManager, itemId, itemType, stateManager, link)]()


Returns: <code>[Link](/api/@dxos/client/classes/Link)&lt;M, L, R&gt;</code>

Arguments: 

`itemManager`: <code>ItemManager</code>

`itemId`: <code>string</code>

`itemType`: <code>undefined | string</code>

`stateManager`: <code>StateManager&lt;NonNullable&lt;M&gt;&gt;</code>

`link`: <code>LinkData</code>

## Properties
### [_itemManager]()
Type: <code>ItemManager</code>
### [_onUpdate]()
Type: <code>Event&lt;[Entity](/api/@dxos/client/classes/Entity)&lt;any&gt;&gt;</code>
### [id]()
Type: <code>string</code>
### [isLink]()
Type: <code>"true"</code>
### [model]()
Type: <code>M</code>
### [modelMeta]()
Type: <code>ModelMeta&lt;any, any, any&gt;</code>
### [modelType]()
Type: <code>string</code>
### [source]()
Type: <code>[Item](/api/@dxos/client/classes/Item)&lt;L&gt;</code>
### [sourceId]()
Type: <code>string</code>
### [target]()
Type: <code>[Item](/api/@dxos/client/classes/Item)&lt;R&gt;</code>
### [targetId]()
Type: <code>string</code>
### [type]()
Type: <code>undefined | string</code>

## Methods
### [subscribe(listener)]()


Subscribe for updates.

Returns: <code>UnsubscribeCallback</code>

Arguments: 

`listener`: <code>function</code>