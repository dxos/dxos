# Class `DataMirror`
> Declared in [`packages/core/echo/echo-db/src/packlets/database/data-mirror.ts`](https://github.com/dxos/protocols/blob/main/packages/core/echo/echo-db/src/packlets/database/data-mirror.ts#L27)

Maintains subscriptions via DataService to create a local copy of the entities (items and links) in the database.

Entities are updated using snapshots and mutations sourced from the DataService.
Entity and model mutations are forwarded to the DataService.
This class is analogous to ItemDemuxer but for databases running in remote mode.

## Constructors
```ts
new DataMirror(
_itemManager: ItemManager,
_dataService: DataService,
_partyKey: PublicKey
)
```

---
- DataMirror : Class
- constructor : Constructor
- new DataMirror : Constructor signature
- _itemManager : Parameter
- _dataService : Parameter
- _partyKey : Parameter
- _subscribeToUpdates : Method
- _subscribeToUpdates : Call signature
- entity : Parameter
- open : Method
- open : Call signature
