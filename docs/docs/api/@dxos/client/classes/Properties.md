# Class `Properties`
<sub>Declared in [packages/sdk/client/src/packlets/proto/gen/schema.ts:13]()</sub>


Base class for generated document types and dynamic objects.

## Constructors
### [constructor(\[opts\])]()


Returns: <code>[Properties](/api/@dxos/client/classes/Properties)</code>

Arguments: 

`opts`: <code>[PropertiesOptions](/api/@dxos/client/types/PropertiesOptions)</code>

## Properties
### [[base]]()
Type: <code>[Properties](/api/@dxos/client/classes/Properties)</code>

Proxied object.
### [title]()
Type: <code>string</code>
### [type]()
Type: <code>[EchoSchemaType](/api/@dxos/client/classes/EchoSchemaType)</code>
### [[data]]()
Type: <code>any</code>
### [[db]]()
Type: <code>undefined | [EchoDatabase](/api/@dxos/client/classes/EchoDatabase)</code>

Database reference if bound.
### [[schema]]()
Type: <code>undefined | [EchoSchemaType](/api/@dxos/client/classes/EchoSchemaType)</code>
### [[toStringTag]]()
Type: <code>string</code>
### [__deleted]()
Type: <code>boolean</code>

Deletion.
### [__typename]()
Type: <code>undefined | string</code>
### [id]()
Type: <code>string</code>

ID accessor.

## Methods
### [\[custom\](depth, options, inspect_)]()


Returns: <code>string</code>

Arguments: 

`depth`: <code>number</code>

`options`: <code>InspectOptionsStylized</code>

`inspect_`: <code>function</code>
### [_getState()]()


Returns: <code>DocumentModelState</code>

Arguments: none
### [_isPersisted()]()


Returns: <code>boolean</code>

Arguments: none
### [_mutate(mutation)]()


Perform mutation on this object's state.
Mutation is applied optimistically: calls to _getState() will return mutated state.

Returns: <code>undefined | MutateResult</code>

Arguments: 

`mutation`: <code>ObjectMutationSet</code>
### [_onBind()]()


Called after object is bound to database.

Returns: <code>Promise&lt;void&gt;</code>

Arguments: none
### [toJSON()]()


Convert to JSON object. Used by  `JSON.stringify` .
https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/JSON/stringify#description

Returns: <code>any</code>

Arguments: none
### [filter(\[opts\])]()


Returns: <code>[TypeFilter](/api/@dxos/client/types/TypeFilter)&lt;[Properties](/api/@dxos/client/classes/Properties)&gt;</code>

Arguments: 

`opts`: <code>[PropertiesOptions](/api/@dxos/client/types/PropertiesOptions)</code>