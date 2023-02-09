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
### [_modelConstructor]()
Type: <code>typeof TextModel</code>
### [[db]]()
Type: <code>undefined | [EchoDatabase](/api/@dxos/react-client/classes/EchoDatabase)</code>

Database reference if bound.
### [[id]]()
Type: <code>string</code>

ID accessor.
### [doc]()
Type: <code>undefined | Doc</code>
### [model]()
Type: <code>undefined | TextModel</code>

## Methods
### [_onBind()]()


Called after object is bound to database.

Returns: <code>Promise&lt;void&gt;</code>

Arguments: none