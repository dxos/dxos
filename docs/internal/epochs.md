# Epochs spec

Epochs are blocks of contiguous messages spanning all peers within a party.
They enable compression for quicker startup, and provide "sync" points for consensus and consistency.


### Consistency

Timeframes provide a common reference point for mutations across the feeds within a party.
However, when peers are partitioned, they start to diverge from each other.
TODO(burdon): Write up branch anaolgy.

## Implementation

### Control feed(s)

- Split out HALO and other control messages (like epoch genesis) into own set of feeds.
- Each peer has its own writable control feed.
- Control feeds can be read and processed independently from data feeds.
- They are piped into PartyStateMachiene.

### Epoch genesis

- When a peer wants to start a new epoch they write an `EpochGensisMessage` into the control feed.
- It contains the timeframe of when the new epoch starts and CID of the data snapshot at that timeframe.

### Snapshots

- Snapshots are content-addressed blobs of reified ECHO state.
- They allow compression by removing history.
  - For example ObjectModel will just save the current state instead of the list of mutations.
- Snapshots can be split into a tree of blobs as an optimization for more efficient storage/replication.
- Peers participate in snapshot exchange protocol, similar to BitTorrent.
- Snapshot allows a peer to bootstrap the ECHO state machiene from that point in time without reading feed messages before it.

