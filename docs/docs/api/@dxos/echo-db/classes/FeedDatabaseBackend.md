# Class `FeedDatabaseBackend`
> Declared in package `@dxos/echo-db`

Database backend that operates on two streams: read and write.

Mutations are read from the incoming streams and applied to the ItemManager via ItemDemuxer.
Write operations result in mutations being written to the outgoing stream.

## Members
- @dxos/echo-db.FeedDatabaseBackend.constructor
- @dxos/echo-db.FeedDatabaseBackend._echoProcessor
- @dxos/echo-db.FeedDatabaseBackend._itemDemuxer
- @dxos/echo-db.FeedDatabaseBackend._itemManager
- @dxos/echo-db.FeedDatabaseBackend.echoProcessor
- @dxos/echo-db.FeedDatabaseBackend.isReadOnly
- @dxos/echo-db.FeedDatabaseBackend.close
- @dxos/echo-db.FeedDatabaseBackend.createDataServiceHost
- @dxos/echo-db.FeedDatabaseBackend.createSnapshot
- @dxos/echo-db.FeedDatabaseBackend.getWriteStream
- @dxos/echo-db.FeedDatabaseBackend.open
