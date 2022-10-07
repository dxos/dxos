# Class `Item`
> Declared in [`packages/core/echo/echo-db/src/packlets/database/item.ts`](https://github.com/dxos/protocols/blob/main/packages/core/echo/echo-db/src/packlets/database/item.ts#L24)

A globally addressable data item.
Items are hermetic data structures contained within a Party. They may be hierarchical.
The Item data structure is governed by a Model class, which implements data consistency.

## Constructors
```ts
new Item(
itemManager: ItemManager,
itemId: string,
itemType: undefined | string,
stateManager: StateManager<NonNullable<M>>,
_writeStream: FeedWriter<EchoEnvelope>,
parent: null | Item<any>
)
```
Items are constructed by the  `Database`  object.

---
- Item : Class
- M : Type parameter
- constructor : Constructor
- new Item : Constructor signature
- M : Type parameter
- itemManager : Parameter
- itemId : Parameter
- itemType : Parameter
- stateManager : Parameter
- _writeStream : Parameter
- parent : Parameter
- _deleted : Property
- _itemManager : Property
- _onUpdate : Property
- _parent : Property
- children : Accessor
- children : Get signature
- deleted : Accessor
- deleted : Get signature
- id : Accessor
- id : Get signature
- links : Accessor
- links : Get signature
- model : Accessor
- model : Get signature
- modelMeta : Accessor
- modelMeta : Get signature
- parent : Accessor
- parent : Get signature
- readOnly : Accessor
- readOnly : Get signature
- refs : Accessor
- refs : Get signature
- type : Accessor
- type : Get signature
- _processMutation : Method
- _processMutation : Call signature
- mutation : Parameter
- getItem : Parameter
- __type : Type literal
- __type : Call signature
- itemId : Parameter
- _updateParent : Method
- _updateParent : Call signature
- parent : Parameter
- delete : Method
- delete : Call signature
- restore : Method
- restore : Call signature
- select : Method
- select : Call signature
- setParent : Method
- setParent : Call signature
- parentId : Parameter
- subscribe : Method
- subscribe : Call signature
- __type : Type literal
- __type : Call signature
- listener : Parameter
- __type : Type literal
- __type : Call signature
- entity : Parameter
- toString : Method
- toString : Call signature
