# Class `DataMirror`
> Declared in package `@dxos/echo-db`

Maintains subscriptions via DataService to create a local copy of the entities (items and links) in the database.

Entities are updated using snapshots and mutations sourced from the DataService.
Entity and model mutations are forwarded to the DataService.
This class is analogous to ItemDemuxer but for databases running in remote mode.

## Members
- @dxos/echo-db.DataMirror.constructor
- @dxos/echo-db.DataMirror._subscribeToUpdates
- @dxos/echo-db.DataMirror.open
