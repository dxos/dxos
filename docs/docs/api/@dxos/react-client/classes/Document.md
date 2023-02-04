# Class `Document`
<sub>Declared in [packages/core/echo/echo-schema/dist/types/src/document.d.ts:46]()</sub>


Documents with dynamic properties.
Don't have a schema.

## Constructors
### [constructor(\[initialProps\], \[_schemaType\])]()


Returns: <code>[Document](/api/@dxos/react-client/classes/Document)</code>

Arguments: 

`initialProps`: <code>Record&lt;string | number | symbol, any&gt;</code>

`_schemaType`: <code>[EchoSchemaType](/api/@dxos/react-client/classes/EchoSchemaType)</code>

## Properties
### [[base]]()
Type: <code>[Document](/api/@dxos/react-client/classes/Document)</code>

Proxied object.
### [_modelConstructor]()
Type: <code>typeof [ObjectModel](/api/@dxos/react-client/classes/ObjectModel)</code>
### [[data]]()
Type: <code>any</code>
### [[db]]()
Type: <code>undefined | [EchoDatabase](/api/@dxos/react-client/classes/EchoDatabase)</code>

Database reference if bound.
### [[deleted]]()
Type: <code>boolean</code>

Deletion.
### [[id]]()
Type: <code>string</code>

ID accessor.
### [[schema]]()
Type: <code>undefined | [EchoSchemaType](/api/@dxos/react-client/classes/EchoSchemaType)</code>
### [[toStringTag]]()
Type: <code>string</code>
### [[type]]()
Type: <code>"null" | string</code>

## Methods
### [\[custom\](depth, options, inspect_)]()


Returns: <code>string</code>

Arguments: 

`depth`: <code>number</code>

`options`: <code>InspectOptionsStylized</code>

`inspect_`: <code>function</code>
### [_onBind()]()


Called after object is bound to database.

Returns: <code>Promise&lt;void&gt;</code>

Arguments: none
### [toJSON()]()


Convert to JSON object. Used by  `JSON.stringify` .
https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/JSON/stringify#description

Returns: <code>any</code>

Arguments: none