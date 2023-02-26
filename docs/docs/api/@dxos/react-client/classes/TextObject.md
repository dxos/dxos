# Class `TextObject`
<sub>Declared in [packages/core/echo/echo-schema/dist/types/src/text-object.d.ts:3]()</sub>


Base class for all echo objects.
Can carry different models.

## Constructors
### [constructor()]()


Returns: <code>[TextObject](/api/@dxos/react-client/classes/TextObject)</code>

Arguments: none

## Properties
### [[base]]()
Type: <code>[TextObject](/api/@dxos/react-client/classes/TextObject)</code>

Proxied object.
### [[db]]()
Type: <code>undefined | [EchoDatabase](/api/@dxos/react-client/classes/EchoDatabase)</code>

Database reference if bound.
### [doc]()
Type: <code>undefined | Doc</code>
### [id]()
Type: <code>string</code>

ID accessor.
### [model]()
Type: <code>undefined | TextModel</code>

## Methods
### [_getState()]()


<<<<<<< HEAD
<<<<<<< HEAD
Returns: <code>Doc</code>

Arguments: none
### [_isPersisted()]()


Returns: <code>boolean</code>

Arguments: none
### [_mutate(mutation)]()


Perform mutation on this object's state.
Mutation is applied optimistically: calls to _getState() will return mutated state.

Returns: <code>undefined | MutateResult</code>

Arguments: 

`mutation`: <code>Mutation</code>
=======
Returns: <code>any</code>

Arguments: none
>>>>>>> ac192b194 (tunneling)
=======
Returns: <code>Doc</code>

Arguments: none
### [_isPersisted()]()


Returns: <code>boolean</code>

Arguments: none
### [_mutate(mutation)]()


Perform mutation on this object's state.
Mutation is applied optimistically: calls to _getState() will return mutated state.

Returns: <code>undefined | MutateResult</code>

Arguments: 

`mutation`: <code>Mutation</code>
>>>>>>> 446e8e253 (docs: regen apidoc and ts guide)
### [_onBind()]()


Called after object is bound to database.

Returns: <code>Promise&lt;void&gt;</code>

Arguments: none