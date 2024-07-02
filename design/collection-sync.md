# Collection sync

```ts
type SyncState = {
  /**
   * List of heads reported by the last sync message.
   **/
  theirHeads: Map<DocumentId, Heads>;
};
```

```ts
type SyncMessage = {
  /**
   * List of our document heads without the ones that we know are the same.
   */
  ourHeads: Map<DocumentId, Heads>;

  /**
   * List of requests for remote heads.
   */
  missing: DocumentId[];
};
```

```ts
function receiveSyncMessage(documentCollection: DocumentCollection, state: SyncState, message: SyncMessage): [SyncState, DocumentId] {
  // += ourHeads -= missing
  const theirHeads = updateHeads(state.theirHeads, message.ourHeads, message.missing);
  const getAllHeads = allHeads(documentCollection);
  const differentHeads = 
}
```
