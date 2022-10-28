# Class `Entity`
> Declared in [`packages/core/echo/echo-db/dist/src/packlets/database/entity.d.ts:10`]()


Base class for all ECHO entitities.

Subclassed by Item and Link.

## Constructors
### constructor
```ts
<M> (_itemManager: ItemManager, _id: string, _type: undefined | string, stateManager: StateManager&lt;NonNullable&lt;M&gt;&gt;) => [Entity](/api/@dxos/client/classes/Entity)&lt;M&gt;
```

## Properties
### _itemManager 
Type: ItemManager
### _onUpdate 
Type: Event&lt;[Entity](/api/@dxos/client/classes/Entity)&lt;any&gt;&gt;
### id
Type: string
### model
Type: M
### modelMeta
Type: ModelMeta&lt;any, any, any&gt;
### modelType
Type: string
### type
Type: undefined | string

## Methods
### subscribe
```ts
(listener: function) => function
```
Subscribe for updates.