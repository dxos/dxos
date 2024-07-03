# Collection sync

<img src="diagrams/collection-sync.drawio.svg" />

## Goals

Collection is defined as a set of automerge documents with known versions (heads).
The state of a collection is mapping from document ID to the current heads of that document.

The collection sync protocol builds a view of the document states (their heads) at other peers on the network.
This enables peers to selectively reconcile only the documents that are not synced using the [per-document sync protocol](https://automerge.org/automerge/api-docs/js/#syncing).

The protocol can work in non-stateful mode, where the other peer's state is initially assumed to be the same as the local one, and then refined during sync. The protocol may also run in stateful mode, where the state of other peers is preserved on-disk.

## Naïve solution

The naïve solution is to exchange the entire mapping of document ID to heads uncompressed:

```protobuf
message CollectionSyncMessage {
  message Document {
    string document_id = 1;
    repeated string heads = 2;
  }

  repeated Document documents = 1;
}
```

Each peer would transmit its entire state in one message, completing the sync protocol in one round.
The message size would be in the order of 100 bytes 