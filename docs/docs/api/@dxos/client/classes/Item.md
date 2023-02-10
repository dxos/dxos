# Class `Item`
<<<<<<< HEAD
<sub>Declared in [packages/core/echo/echo-db/dist/types/src/packlets/database/item.d.ts:25]()</sub>
=======
<sub>Declared in [packages/core/echo/echo-db/dist/types/src/packlets/database/item.d.ts:14]()</sub>
>>>>>>> 464c6e793 (docs wip)


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
- The mutatation queue.
- Optimistic mutations.

## Constructors
<<<<<<< HEAD
### [constructor(_itemManager, _id)]()
=======
### [constructor(_itemManager, _id, _type, stateManager, \[_writeStream\], \[parent\])]()
>>>>>>> 464c6e793 (docs wip)


Items are constructed by the  `Database`  object.

Returns: <code>[Item](/api/@dxos/client/classes/Item)&lt;M&gt;</code>

Arguments: 

`_itemManager`: <code>ItemManager</code>

`_id`: <code>string</code>
<<<<<<< HEAD
=======

`_type`: <code>undefined | string</code>

`stateManager`: <code>StateManager&lt;NonNullable&lt;M&gt;&gt;</code>

`_writeStream`: <code>FeedWriter&lt;DataMessage&gt;</code>

`parent`: <code>"null" | [Item](/api/@dxos/client/classes/Item)&lt;any&gt;</code>
>>>>>>> 464c6e793 (docs wip)

## Properties
### [_debugLabel]()
Type: <code>undefined | string</code>
### [_itemManager]()
Type: <code>ItemManager</code>
### [_modelMeta]()
Type: <code>"null" | ModelMeta&lt;any, any, any&gt;</code>
### [_onUpdate]()
Type: <code>Event&lt;[Item](/api/@dxos/client/classes/Item)&lt;any&gt;&gt;</code>
<<<<<<< HEAD
=======
### [children]()
Type: <code>[Item](/api/@dxos/client/classes/Item)&lt;any&gt;[]</code>
>>>>>>> 464c6e793 (docs wip)
### [deleted]()
Type: <code>boolean</code>
### [id]()
Type: <code>string</code>
<<<<<<< HEAD
### [initialized]()
Type: <code>boolean</code>
=======
### [model]()
Type: <code>M</code>
>>>>>>> 464c6e793 (docs wip)
### [modelMeta]()
Type: <code>undefined | ModelMeta&lt;any, any, any&gt;</code>
### [modelType]()
Type: <code>string</code>
### [parent]()
<<<<<<< HEAD
Type: <code>"null" | string</code>
### [state]()
Type: <code>StateOf&lt;M&gt;</code>
=======
Type: <code>"null" | [Item](/api/@dxos/client/classes/Item)&lt;any&gt;</code>
### [readOnly]()
Type: <code>boolean</code>
### [type]()
Type: <code>undefined | string</code>
>>>>>>> 464c6e793 (docs wip)

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
### [subscribe(listener)]()


Subscribe for updates.

Returns: <code>UnsubscribeCallback</code>

Arguments: 

`listener`: <code>function</code>
### [toString()]()


Returns: <code>string</code>

Arguments: none