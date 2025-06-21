# Indexed document store

- Document manager stores, syncs, and indexes a set of automerge documents.
- No opinion over the doc contents.
- The indexes are pluggable.
- Each document belongs to a space.
- Sync happens in the context of a space.
- Designed for efficient queries.
- Indexes can span spaces.

## Design overview

- Built on top of a key-value store with batched atomic writes.
- Supports sync and async indexes.
- Indexes can be added an removed dynamically at runtime.

## Data layout

### Considerations

- Sync
- Indexes
- Efficient queries for most common operations
  - Data read
  - Sync

### Key-value schema

Latest heads store:

- `document:heads:<spaceId>:<docId> => <heads>`

CRDT store:

- `document:crdt:<spaceId>:<docId>:snapshot:<heads> => <CRDT>`
- `document:crdt:<spaceId>:<docId>:incremental:<chunk hash> => <CRDT>`

Reified state store:

- `document:state:<spaceId>:<docId> => <encoding>,<encoded data>`

Sync state store:

- `document:sync-states:<spaceId>:<docId>:<peerId> => <syncState>`

Index states:

- `index:<indexId>:descriptor => <IndexDescriptor>`


### Queries

#### Replication with a peer

Given `peerId` find all documents that need to be synced with that peer.

TODO

## Open questions

- How is the list of documents replicated / is this a concern of the document manager?
