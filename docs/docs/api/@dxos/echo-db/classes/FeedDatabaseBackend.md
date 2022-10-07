# Class `FeedDatabaseBackend`
> Declared in [`packages/core/echo/echo-db/src/packlets/database/database-backend.ts`](https://github.com/dxos/protocols/blob/main/packages/core/echo/echo-db/src/packlets/database/database-backend.ts#L46)

Database backend that operates on two streams: read and write.

Mutations are read from the incoming streams and applied to the ItemManager via ItemDemuxer.
Write operations result in mutations being written to the outgoing stream.

## Constructors
```ts
new FeedDatabaseBackend(
_outboundStream: undefined | FeedWriter<EchoEnvelope>,
_snapshot: DatabaseSnapshot,
_options: ItemDemuxerOptions
)
```

---
- FeedDatabaseBackend : Class
- constructor : Constructor
- new FeedDatabaseBackend : Constructor signature
- _outboundStream : Parameter
- _snapshot : Parameter
- _options : Parameter
- _echoProcessor : Property
- _itemDemuxer : Property
- _itemManager : Property
- echoProcessor : Accessor
- echoProcessor : Get signature
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
