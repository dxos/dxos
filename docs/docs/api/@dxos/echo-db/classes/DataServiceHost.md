# Class `DataServiceHost`
> Declared in package `@dxos/echo-db`

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
