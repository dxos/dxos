# Indexed document store

- Document manager stores, syncs, and indexes a set of automerge documents.
- No opinion over the doc contents.
- The indexes are pluggable.
- Each document belongs to a space.
- Sync happens in the context of a space.
- Designed for efficient queries.

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

- `documents:<spaceId>:<docId>:heads => <heads>`

CRDT store:

- `documents:<spaceId>:<docId>:snapshot:<heads> => <CRDT>`
- `documents:<spaceId>:<docId>:incremental:<chunk hash> => <CRDT>`

Reified state store:

- `documents:<spaceId>:<docId>:state => <encoding>,<encoded data>`

Sync state store:

- `documents:<spaceId>:<docId>:sync-state:<peerId> => <syncState>`

### Queries

#### Replication with a peer

Given `peerId` find all documents that need to be synced with that peer.

TODO

## Open questions

- How is the list of documents replicated / is this a concern of the document manager?
