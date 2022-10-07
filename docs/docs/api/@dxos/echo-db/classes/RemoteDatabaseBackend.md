# Class `RemoteDatabaseBackend`
> Declared in [`packages/core/echo/echo-db/src/packlets/database/database-backend.ts`](https://github.com/dxos/protocols/blob/main/packages/core/echo/echo-db/src/packlets/database/database-backend.ts#L100)

Database backend that is backed by the DataService instance.

Uses DataMirror to populate entities in ItemManager.

## Constructors
```ts
new RemoteDatabaseBackend(
_service: DataService,
_partyKey: PublicKey
)
```

---
- RemoteDatabaseBackend : Class
- constructor : Constructor
- new RemoteDatabaseBackend : Constructor signature
- _service : Parameter
- _partyKey : Parameter
- _itemManager : Property
- isReadOnly : Accessor
- isReadOnly : Get signature
- close : Method
- close : Call signature
- createDataServiceHost : Method
- createDataServiceHost : Call signature
- createSnapshot : Method
- createSnapshot : Call signature
- getWriteStream : Method
- getWriteStream : Call signature
- open : Method
- open : Call signature
- itemManager : Parameter
- modelFactory : Parameter
