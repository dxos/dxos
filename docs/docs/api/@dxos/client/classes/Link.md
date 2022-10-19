# Class `Link`
> Declared in [`packages/core/echo/echo-db/dist/src/packlets/database/link.d.ts:15`]()


Link variant of an item. Link two objects together. Can hold a custom model.

## Constructors
```ts
new Link <M, L, R> (itemManager: ItemManager, itemId: string, itemType: undefined | string, stateManager: StateManager<NonNullable<M>>, link: LinkData) => Link<M, L, R>
```

## Properties
### `_itemManager: ItemManager`
### `_onUpdate: Event<Entity<any>>`
### `id:  get string`
### `isLink:  get "true"`
### `model:  get M`
### `modelMeta:  get ModelMeta<any, any, any>`
### `modelType:  get string`
### `source:  get Item<L>`
### `sourceId:  get string`
### `target:  get Item<R>`
### `targetId:  get string`
### `type:  get undefined | string`

## Functions
```ts
subscribe (listener: function) => function
```
Subscribe for updates.