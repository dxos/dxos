# Class `EchoObject`
<sub>Declared in [packages/core/echo/echo-schema/dist/types/src/object.d.ts:9]()</sub>


Base class for all echo objects.
Can carry different models.

## Constructors
### [constructor(modelConstructor)]()


Returns: <code>[EchoObject](/api/@dxos/react-client/classes/EchoObject)&lt;T&gt;</code>

Arguments: 

`modelConstructor`: <code>ModelConstructor&lt;T&gt;</code>

## Properties
### [[base]]()
Type: <code>[EchoObject](/api/@dxos/react-client/classes/EchoObject)&lt;T&gt;</code>

Proxied object.
### [[db]]()
Type: <code>undefined | [EchoDatabase](/api/@dxos/react-client/classes/EchoDatabase)</code>

Database reference if bound.
### [id]()
Type: <code>string</code>

ID accessor.

## Methods
### [_getState()]()


<<<<<<< HEAD
<<<<<<< HEAD
Returns: <code>StateOf&lt;T&gt;</code>

Arguments: none
### [_isPersisted()]()


Returns: <code>boolean</code>

Arguments: none
### [_mutate(mutation)]()


Perform mutation on this object's state.
Mutation is applied optimistically: calls to _getState() will return mutated state.

Returns: <code>undefined | MutateResult</code>

Arguments: 

`mutation`: <code>MutationOf&lt;T&gt;</code>
=======
Returns: <code>any</code>

Arguments: none
>>>>>>> ac192b194 (tunneling)
=======
Returns: <code>StateOf&lt;T&gt;</code>

Arguments: none
### [_isPersisted()]()


Returns: <code>boolean</code>

Arguments: none
### [_mutate(mutation)]()


Perform mutation on this object's state.
Mutation is applied optimistically: calls to _getState() will return mutated state.

Returns: <code>undefined | MutateResult</code>

Arguments: 

`mutation`: <code>MutationOf&lt;T&gt;</code>
>>>>>>> 446e8e253 (docs: regen apidoc and ts guide)
### [_onBind()]()


Called after object is bound to database.

Returns: <code>Promise&lt;void&gt;</code>

Arguments: none