# Data Model

## Definitions

1. Message: Record corresponding to a protobuf schema.
1. Feed: Ordered collection of messages.
1. Party: Collection of messages from multiple Feeds.
1. Item: Logically consistent set of messages.
1. Model: Versioned state machine that determines consistency of messges within a subset of a item.

![ECHO DB](./diagrams/echo-db.png)


## Mechanism

1. A Party must contain by default a System item.
1. Every item must encode metadata that defines exactly one Model type.
    - If a Model changes (i.e., version is updated) then the item must be tombstoned and forked.
    - The model is required to hydrate/dehydrate the item.
1. The system uses the ObjectModel to encode item metadata (e.g., title, properties).
    - Such messages are tagged with a system label in order to differentiate these data from other messages in
      item that use the ObjectModel for the main payload.
1. Every message (in every Feed) within a Party must have a reference (Party-local ID) to a item (ID).
1. The item metadata enables "dumb" agents (e.g., generic bots) to dynamically load code to process it.
1. Items may be nested; Items within a party form a DAG.
1. Items may include properties that are soft references to other Items (either within the current or external Parties).

## Notes

1. The above considers items to be the domain of consistency (not parties).
1. All messages correspond to exactly on model INSTANCE within a item.
1. This has implications for the current API -- and would motivate having Models defined "up-front"
   rathar than ad-hoc in hook defintions (akin to Apollo GraphQL queries?)
1. This system may allow of queries that range across the party and return collections of Items.
