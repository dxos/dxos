# Class `Link`
> Declared in [`packages/core/echo/echo-db/dist/src/packlets/database/link.d.ts`](undefined)

Link variant of an item. Link two objects together. Can hold a custom model.

## Constructors
```ts
new Link(
itemManager: ItemManager,
itemId: string,
itemType: undefined | string,
stateManager: StateManager<NonNullable<M>>,
link: LinkData
)
```

---
- Link : Class
- M : Type parameter
- L : Type parameter
- R : Type parameter
- constructor : Constructor
- new Link : Constructor signature
- M : Type parameter
- L : Type parameter
- R : Type parameter
- itemManager : Parameter
- itemId : Parameter
- itemType : Parameter
- stateManager : Parameter
- link : Parameter
- _itemManager : Property
- _onUpdate : Property
- id : Accessor
- id : Get signature
- isLink : Accessor
- isLink : Get signature
- model : Accessor
- model : Get signature
- modelMeta : Accessor
- modelMeta : Get signature
- source : Accessor
- source : Get signature
- sourceId : Accessor
- sourceId : Get signature
- target : Accessor
- target : Get signature
- targetId : Accessor
- targetId : Get signature
- type : Accessor
- type : Get signature
- subscribe : Method
- subscribe : Call signature
- __type : Type literal
- __type : Call signature
- listener : Parameter
- __type : Type literal
- __type : Call signature
- entity : Parameter
