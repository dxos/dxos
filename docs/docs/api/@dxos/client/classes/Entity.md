# Class `Entity`
> Declared in [`packages/core/echo/echo-db/dist/src/packlets/database/entity.d.ts`]()

Base class for all ECHO entitities.

Subclassed by Item and Link.

## Constructors
```ts
new Entity <M> (_itemManager: ItemManager, _id: string, _type: undefined | string, stateManager: StateManager<NonNullable<M>>) => Entity<M>
```

## Properties
### `_itemManager: ItemManager`
### `_onUpdate: Event<Entity<any>>`

## Functions
```ts
subscribe (listener: function) => function
```
Subscribe for updates.