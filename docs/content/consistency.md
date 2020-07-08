# Notes on Consistency (and Partitions)

## Definitions

1. Message: Record corresponding to a protobuf schema.
1. Feed: Orderd collection of messages.
1. Party: Collection of messages from multiple Feeds.
1. Partition: Logically isolated set of messages.
1. Model: Versioned state machine that determines consistency of messges within a subset of a Partition.

## Mechanism

1. A Party must contain by default a System Partition.
1. Every message (in every Feed) within a Party must have:
    - A reference (Party-local ID) to a partition (instance);
    - A reference (WRN) to a model INSTANCE (of a particular type);
    - A consistency anchor.
1. Every Partition must encode metadata that defines one OR MORE Model INSTANCES (incl. type and version).
    - For example a Partition corresponding to an instance of a chess game (e.g., "Game-1") may require
      an ObjectModel to process the game metadata (title, players, etc.) and a ChessModel to process the game.
    - If a Model changes (i.e., version is updated) then the partition must be tombstoned and forked.
    - Partitions define the models that are required to hydrate/dehydrate.
1. The Partition metadata enables "dumb" agents (e.g., generic bots) to dynamically load code to process it.
1. Views may be constructed via queries that range over multiple Partitions (e.g., show metadata for all Chess games);
   but the only Filters that make sense restrict the Partion and/or Model type.

## Notes

1. The above considers Partitions to be the domain of consistency (not parties).
1. And that all messages correspond to exactly on model INSTANCE within a partition.
