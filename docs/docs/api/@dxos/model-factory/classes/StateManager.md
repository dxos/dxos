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

## Members
- @dxos/model-factory.StateManager.M
- @dxos/model-factory.StateManager.constructor
- @dxos/model-factory.StateManager._model
- @dxos/model-factory.StateManager._modelMeta
- @dxos/model-factory.StateManager._mutationProcessed
- @dxos/model-factory.StateManager._mutations
- @dxos/model-factory.StateManager._optimisticMutations
- @dxos/model-factory.StateManager._stateMachine
- @dxos/model-factory.StateManager.initialized
- @dxos/model-factory.StateManager.model
- @dxos/model-factory.StateManager.modelMeta
- @dxos/model-factory.StateManager.modelType
- @dxos/model-factory.StateManager._resetStateMachine
- @dxos/model-factory.StateManager._write
- @dxos/model-factory.StateManager.createSnapshot
- @dxos/model-factory.StateManager.initialize
- @dxos/model-factory.StateManager.processMessage
- @dxos/model-factory.StateManager.resetToSnapshot
