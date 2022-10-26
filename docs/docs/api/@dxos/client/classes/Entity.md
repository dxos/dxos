# Class `Entity`
> Declared in [`packages/core/echo/echo-db/dist/src/packlets/database/entity.d.ts:10`]()


Base class for all ECHO entitities.

Subclassed by Item and Link.

## Constructors
### constructor
```ts
<M> (_itemManager: ItemManager, _id: string, _type: undefined | string, stateManager: StateManager<NonNullable<M>>) => Entity<M>
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
### model
> Type: `M`
<br/>
### modelMeta
> Type: `ModelMeta<any, any, any>`
<br/>
### modelType
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