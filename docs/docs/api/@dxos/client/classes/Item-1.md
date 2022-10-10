# Class `Item`
> Declared in [`packages/core/echo/echo-db/dist/src/packlets/database/item.d.ts`](undefined)

A globally addressable data item.
Items are hermetic data structures contained within a Party. They may be hierarchical.
The Item data structure is governed by a Model class, which implements data consistency.

## Constructors
```ts
const newItem = new Item(
itemManager: ItemManager,
itemId: string,
itemType: undefined | string,
stateManager: StateManager<NonNullable<M>>,
_writeStream: FeedWriter<EchoEnvelope>,
parent: null | Item<any>
)
```
Items are constructed by the  `Database`  object.

## Properties

## Functions
