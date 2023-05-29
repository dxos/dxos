# Class `Item`
<sub>Declared in [packages/core/echo/echo-db/dist/types/src/packlets/database/item.d.ts:24]()</sub>


A globally addressable data item.
Items are hermetic data structures contained within a Space. They may be hierarchical.
The Item data structure is governed by a Model class, which implements data consistency.

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
- The mutation queue.
- Optimistic mutations.


## Constructors
### [constructor(_itemManager, _id)]()



Items are constructed by the  `Database`  object.


Returns: <code>[Item](/api/@dxos/client/classes/Item)&lt;M&gt;</code>

Arguments: 

`_itemManager`: <code>ItemManager</code>

`_id`: <code>string</code>


## Properties
### [_debugLabel]()
Type: <code>undefined | string</code>

### [_itemManager]()
Type: <code>ItemManager</code>

### [_modelMeta]()
Type: <code>"null" | ModelMeta</code>

### [deleted]()
Type: <code>boolean</code>

### [id]()
Type: <code>string</code>

### [initialized]()
Type: <code>boolean</code>

### [modelMeta]()
Type: <code>undefined | ModelMeta</code>

### [modelType]()
Type: <code>string</code>

### [parent]()
Type: <code>"null" | string</code>

### [state]()
Type: <code>StateOf&lt;M&gt;</code>


## Methods
### [createSnapshot()]()



Create a snapshot of the current state.


Returns: <code>EchoObject</code>

Arguments: none

### [initialize(modelConstructor)]()



Perform late intitalization.

Only possible if the modelContructor wasn't passed during StateManager's creation.


Returns: <code>void</code>

Arguments: 

`modelConstructor`: <code>ModelConstructor&lt;M&gt;</code>

### [processMessage(mutation)]()



Processes mutations from the inbound stream.


Returns: <code>void</code>

Arguments: 

`mutation`: <code>Mutation</code>

### [processOptimisticMutation(mutation)]()



Returns: <code>void</code>

Arguments: 

`mutation`: <code>Mutation</code>

### [resetToSnapshot(snapshot)]()



Reset the state to existing snapshot.


Returns: <code>void</code>

Arguments: 

`snapshot`: <code>EchoObject</code>

### [toString()]()



Returns: <code>string</code>

Arguments: none
