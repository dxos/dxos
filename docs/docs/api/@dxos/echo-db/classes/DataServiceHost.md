# Class `DataServiceHost`
> Declared in [`packages/core/echo/echo-db/src/packlets/database/data-service-host.ts`](https://github.com/dxos/protocols/blob/main/packages/core/echo/echo-db/src/packlets/database/data-service-host.ts#L35)

Provides methods for DataService for a single party.

A DataServiceRouter must be placed before it to route requests to different DataServiceHost instances based on party id.

## Constructors
```ts
new DataServiceHost(
_itemManager: ItemManager,
_itemDemuxer: ItemDemuxer,
_writeStream: FeedWriter<EchoEnvelope>
)
```

---
- DataServiceHost : Class
- constructor : Constructor
- new DataServiceHost : Constructor signature
- _itemManager : Parameter
- _itemDemuxer : Parameter
- _writeStream : Parameter
- subscribeEntitySet : Method
- subscribeEntitySet : Call signature
- subscribeEntityStream : Method
- subscribeEntityStream : Call signature
- request : Parameter
- write : Method
- write : Call signature
- request : Parameter
