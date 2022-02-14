# Epochs spec

Epochs are blocks of contiguous messages spanning all peers within a party.
They enable compression for quicker startup, and provide "sync" points for consensus and consistency.


### Consistency

Timeframes provide a common reference point for mutations across the feeds within a party.
However, when peers are partitioned, they start to diverge from each other.
TODO(burdon): Write up branch anaolgy.

## Implementation

### Control feeds

- Split out HALO and other control messages (like epoch genesis) into own set of feeds.
- Each peer has a writable control feed in addition to its data (ECHO) feed.
- Control feeds can be read and processed independently from data feeds.
- They are piped into PartyStateMachiene.

### Epoch genesis

- When a peer wants to start a new epoch they write an `EpochGensisMessage` into the control feed.
- It contains the timeframe of when the new epoch starts and CID of the data snapshot at that timeframe.

### Snapshots

- Snapshots allow peers to bootstrap the ECHO state machiene from that point in time without reading feed messages before it.
- Snapshots are content-addressed blobs consisting of a hierarchical set of reified HALO and ECHO models.
  - HALO snapshots will be removed once control feeds are implemented.
  - Each items outputs a snapshot from its corresponding model.
  - If the model doesn't override the snapshot, then the list of messages is output.
- They allow compression by removing history.
  - The ObjectModel will just save the current state instead of the list of mutations.
- Peers participate in snapshot exchange protocol, similar to BitTorrent.
  - Based on party policy a particular peer may be authorized to declare snapshots (e.g., a bot); otherwise a peer election may be implemented.
- Snapshots can be split into a tree of blobs as an optimization for more efficient storage/replication.
  - This enables items to restore their models on demand (or for parties to only partially hydrate specific items).
- Snapshots reference the hash of a previous snapshot, which may contain additional historical data.
  - Certain models may decide to discard information when creating a snapshot.
    - Examples: the MessengerModel may discard old messages; the ObjectModel may discard deleted objects.
  - It may be possible for models to asynchronously load previous snapshots to retrieve historical information.
- Snapshots may be analogous to blocks in a blockchain.
- At the beginning of an epoch each model may decide to discard information (e.g., deleted items beyond a TTL); 
  i.e,. that the snapshot currently being created omits certain data.
- Bots may become file storage servers for large data sets, e.g., implementing proxy models (for thin clients).

## Milestones

### V0

- [ ] Each model implements to/from snaphost (defined by protobuf).
  - [ ] Models may decide to discard information.
- [ ] Party creates tree of item snapshots.
- [ ] Party records snapshot file, referenced by CID, which contains the following metadata:.
  - Timeframe
  - Datetime
  - Previous snapshot CID
  - Model versions
- [ ] The epoch generator peer writes an epoch genesis message to its feed.
- [ ] When peers process the epoch genesis message they create the corresponding snapshot and store it locally.
- [ ] When peers join a party they may request the snapshot for a particular epoch.
- [ ] Each peer stores the latest epoch genesis message for each party; this is used to bootstrap (and will be replaced later by the control feed).
- [ ] Ability to simulate multi-peer paries with epoch generation.

ISSUES
- [ ] Who initiates an epoch? E.g., leadership election; hardcoded (bot)?
- [ ] What happens if peers join, but get "stale" messages from peers that have not yet joined the epoch?
- [ ] What if the code changes for models.









