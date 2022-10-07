# Class `StateManager`
> Declared in package `@dxos/model-factory`

Manages the state machine lifecycle.

Snapshots represent the reified state of a set of mutations up until at a particular Timeframe.
The state machine maintains a queue of optimistic and committed mutations as they are written to the output stream.
Each mutation written to the stream gets a receipt the provides an async callback when the message is written to the store.
If another mutation is written to the store ahead of the optimistic mutation,
then the state machine is rolled back to the previous snapshot,
and the ordered set of mutations since that point is replayed.

The state of the model is formed from the following components (in order):
- The custom snapshot from the initial state.
- The snapshot mutations from the initial state.
- The mutatation queue.
- Optimistic mutations.

## Constructors
```ts
new StateManager(
_modelType: string,
modelConstructor: undefined | ModelConstructor<M>,
_itemId: string,
_initialState: ModelSnapshot,
_memberKey: PublicKey,
_writeStream: null | FeedWriter<Uint8Array>
)
```
