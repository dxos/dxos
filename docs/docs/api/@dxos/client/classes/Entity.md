# Class `Entity`
Declared in [`packages/core/echo/echo-db/dist/src/packlets/database/entity.d.ts:10`]()


Base class for all ECHO entitities.

Subclassed by Item and Link.

## Constructors
### [`constructor`]()


Returns: [`Entity`](/api/@dxos/client/classes/Entity)`<M>`

Arguments: 

`_itemManager`: `ItemManager`

`_id`: `string`

`_type`: `undefined | string`

`stateManager`: `StateManager<NonNullable<M>>`

## Properties
### [`_itemManager`]()
Type: `ItemManager`
### [`_onUpdate`]()
Type: `Event<`[`Entity`](/api/@dxos/client/classes/Entity)`<any>>`
### [`id`]()
Type: `string`
### [`model`]()
Type: `M`
### [`modelMeta`]()
Type: `ModelMeta<any, any, any>`
### [`modelType`]()
Type: `string`
### [`type`]()
Type: `undefined | string`

## Methods
### [`subscribe`]()


Subscribe for updates.

Returns: `UnsubscribeCallback`

Arguments: 

`listener`: `function`