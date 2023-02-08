# Class `EchoObject`
<sub>Declared in [packages/core/echo/echo-schema/dist/types/src/object.d.ts:8]()</sub>


Base class for all echo objects.
Can carry different models.

## Constructors
### [constructor()]()


Returns: <code>[EchoObject](/api/@dxos/client/classes/EchoObject)&lt;T&gt;</code>

Arguments: none

## Properties
### [[base]]()
Type: <code>[EchoObject](/api/@dxos/client/classes/EchoObject)&lt;T&gt;</code>

Proxied object.
### [[db]]()
Type: <code>undefined | [EchoDatabase](/api/@dxos/client/classes/EchoDatabase)</code>

Database reference if bound.
### [[id]]()
Type: <code>string</code>

ID accessor.

## Methods
### [_onBind()]()


Called after object is bound to database.

Returns: <code>Promise&lt;void&gt;</code>

Arguments: none