# Class FeedDatabaseBackend
> Declared in package `@dxos/echo-db`
Database backend that operates on two streams: read and write.

Mutations are read from the incoming streams and applied to the ItemManager via ItemDemuxer.
Write operations result in mutations being written to the outgoing stream.

## Fields

## Methods
