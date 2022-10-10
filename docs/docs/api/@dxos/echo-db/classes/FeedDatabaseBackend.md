# Class `FeedDatabaseBackend`
> Declared in [`packages/core/echo/echo-db/src/packlets/database/database-backend.ts`](https://github.com/dxos/protocols/blob/main/packages/core/echo/echo-db/src/packlets/database/database-backend.ts#L46)

Database backend that operates on two streams: read and write.

Mutations are read from the incoming streams and applied to the ItemManager via ItemDemuxer.
Write operations result in mutations being written to the outgoing stream.

## Constructors
```ts
const newFeedDatabaseBackend = new FeedDatabaseBackend(
_outboundStream: undefined | FeedWriter<EchoEnvelope>,
_snapshot: DatabaseSnapshot,
_options: ItemDemuxerOptions
)
```

## Properties

## Functions
