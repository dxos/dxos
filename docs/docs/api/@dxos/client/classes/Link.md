# Class `Link`
> Declared in [`packages/core/echo/echo-db/dist/src/packlets/database/link.d.ts`]()

Link variant of an item. Link two objects together. Can hold a custom model.

## Constructors
```ts
new Link <M, L, R> (itemManager: ItemManager, itemId: string, itemType: undefined | string, stateManager: StateManager<NonNullable<M>>, link: LinkData) => Link<M, L, R>
```

## Properties
### `_itemManager: ItemManager`
### `_onUpdate: Event<Entity<any>>`

## Functions
```ts
subscribe (listener: function) => function
```
Subscribe for updates.