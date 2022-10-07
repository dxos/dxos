# Class `StateManager`
> Declared in [`packages/core/echo/model-factory/src/state-manager.ts`](https://github.com/dxos/protocols/blob/main/packages/core/echo/model-factory/src/state-manager.ts#L57)

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

---
- StateManager : Class
- M : Type parameter
- constructor : Constructor
- new StateManager : Constructor signature
- M : Type parameter
- _modelType : Parameter
- modelConstructor : Parameter
- _itemId : Parameter
- _initialState : Parameter
- _memberKey : Parameter
- _writeStream : Parameter
- _model : Property
- _modelMeta : Property
- _mutationProcessed : Property
- _mutations : Property
- _optimisticMutations : Property
- _stateMachine : Property
- initialized : Accessor
- initialized : Get signature
- model : Accessor
- model : Get signature
- modelMeta : Accessor
- modelMeta : Get signature
- modelType : Accessor
- modelType : Get signature
- _resetStateMachine : Method
- _resetStateMachine : Call signature
- _write : Method
- _write : Call signature
- mutation : Parameter
- createSnapshot : Method
- createSnapshot : Call signature
- initialize : Method
- initialize : Call signature
- modelConstructor : Parameter
- processMessage : Method
- processMessage : Call signature
- meta : Parameter
- mutation : Parameter
- resetToSnapshot : Method
- resetToSnapshot : Call signature
- snapshot : Parameter
