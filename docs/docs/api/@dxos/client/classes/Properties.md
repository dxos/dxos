# Class `Properties`
<sub>Declared in [packages/sdk/client/src/packlets/proto/gen/schema.ts:16]()</sub>





## Constructors
### [constructor(\[initValues\], \[opts\])]()



Returns: <code>[Properties](/api/@dxos/client/classes/Properties)</code>

Arguments: 

`initValues`: <code>Partial&lt;[PropertiesProps](/api/@dxos/client/types/PropertiesProps)&gt;</code>

`opts`: <code>[TypedObjectOpts](/api/@dxos/client/types/TypedObjectOpts)</code>


## Properties
### [[base]]()
Type: <code>[Properties](/api/@dxos/client/classes/Properties)</code>

Proxied object.

### [name]()
Type: <code>string</code>

### [type]()
Type: <code>[EchoSchemaType](/api/@dxos/client/classes/EchoSchemaType)</code>

### [[data]]()
Type: <code>any</code>

### [[db]]()
Type: <code>undefined | [EchoDatabase](/api/@dxos/client/classes/EchoDatabase)</code>

Database reference if bound.

### [[readOnly]]()
Type: <code>boolean</code>

Returns boolean. If  `true` , read only access is activated.

### [[schema]]()
Type: <code>undefined | [EchoSchemaType](/api/@dxos/client/classes/EchoSchemaType)</code>

Returns the schema type descriptor for the object.

### [[toStringTag]]()
Type: <code>string</code>

### [__deleted]()
Type: <code>boolean</code>

Deletion.

### [__typename]()
Type: <code>undefined | string</code>

Fully qualified name of the object type for objects created from the schema.

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

### [\[subscribe\](callback)]()



Returns: <code>function</code>

Arguments: 

`callback`: <code>function</code>

### [_beforeBind()]()



Returns: <code>void</code>

Arguments: none

### [toJSON()]()



Convert to JSON object. Used by  `JSON.stringify` .
https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/JSON/stringify#description


Returns: <code>any</code>

Arguments: none

### [filter(\[opts\])]()



Returns: <code>[TypeFilter](/api/@dxos/client/types/TypeFilter)&lt;[Properties](/api/@dxos/client/classes/Properties)&gt;</code>

Arguments: 

`opts`: <code>Partial&lt;[PropertiesProps](/api/@dxos/client/types/PropertiesProps)&gt;</code>
