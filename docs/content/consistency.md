# Notes on Consistency (and Partitions)

## Definitions

1. Message: Record corresponding to a protobuf schema.
1. Feed: Orderd collection of messages.
1. Party: Collection of messages from multiple Feeds.
1. Partition: Logically isolated set of messages.
1. Model: Versioned state machine that determines consistency of messges within a subset of a Partition.

## Mechanism

1. A Party must contain by default a System Partition.
1. Every Partition must encode metadata that defines exactly one Model type.
    - If a Model changes (i.e., version is updated) then the partition must be tombstoned and forked.
    - The model is required to hydrate/dehydrate the partition.
1. The system uses the ObjectModel to encode Partition metadata (e.g., title, properties).
    - Such messages are tagged with a system label in order to differentiate these data from other messages in
      partition that use the ObjectModel for the main payload.
1. Every message (in every Feed) within a Party must have a reference (Party-local ID) to a partition (instance).
1. The Partition metadata enables "dumb" agents (e.g., generic bots) to dynamically load code to process it.
1. Views may be constructed via queries that range over multiple Partitions (e.g., show metadata for all Chess games);
   but the only Filters that make sense restrict the Partion and/or Model type.

## Notes

1. The above considers Partitions to be the domain of consistency (not parties).
1. All messages correspond to exactly on model INSTANCE within a partition.
1. This has implications for the current API -- and would motivate having Models defined "up-front"
   rathar than ad-hoc in hook defintions (akin to Apollo GraphQL queries?)
 