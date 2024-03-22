# Class `Properties`
<sub>Declared in [packages/sdk/client-protocol/dist/types/src/proto/gen/schema.d.ts:9]()</sub>




## Constructors
### [constructor(\[initValues\], \[opts\])]()




Returns: <code>[Properties](/api/@dxos/client/classes/Properties)</code>

Arguments: 

`initValues`: <code>Partial&lt;[PropertiesProps](/api/@dxos/client/types/PropertiesProps)&gt;</code>

`opts`: <code>TypedObjectOptions</code>



## Properties
### [[base]]()
Type: <code>[Properties](/api/@dxos/client/classes/Properties)</code>

Proxied object.

### [[devtoolsFormatter]]()
Type: <code>DevtoolsFormatter</code>



### [_signal]()
Type: <code>GenericSignal</code>



### [name]()
Type: <code>string</code>



### [schema]()
Type: <code>[Schema](/api/@dxos/client/classes/Schema)</code>



### [[data]]()
Type: <code>any</code>



### [[db]]()
Type: <code>undefined | [EchoDatabase](/api/@dxos/client/interfaces/EchoDatabase)</code>

Database reference if bound.

### [[debug]]()
Type: <code>string</code>



### [[immutable]]()
Type: <code>boolean</code>



### [[meta]]()
Type: <code>[ObjectMeta](/api/@dxos/client/types/ObjectMeta)</code>



### [[schema]]()
Type: <code>undefined | [Schema](/api/@dxos/client/classes/Schema)</code>

Returns the schema type descriptor for the object.

### [[toStringTag]]()
Type: <code>string</code>



### [__deleted]()
Type: <code>boolean</code>



### [__info]()
Type: <code>never</code>



### [__meta]()
Type: <code>[ObjectMeta](/api/@dxos/client/types/ObjectMeta)</code>



### [__schema]()
Type: <code>undefined | [Schema](/api/@dxos/client/classes/Schema)</code>



### [__typename]()
Type: <code>undefined | string</code>

Fully qualified name of the object type for objects created from the schema.

### [id]()
Type: <code>string</code>

ID accessor.


## Methods
### [\[custom\](depth, options, inspect_)]()




Returns: <code>void</code>

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




### [_emitUpdate()]()




Returns: <code>void</code>

Arguments: none




### [toJSON()]()


Convert to JSON object. Used by  `JSON.stringify` .
https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/JSON/stringify#description

Returns: <code>any</code>

Arguments: none




### [filter(\[filter\])]()




Returns: <code>[Filter](/api/@dxos/client/classes/Filter)&lt;[Properties](/api/@dxos/client/classes/Properties)&gt;</code>

Arguments: 

`filter`: <code>Partial&lt;[PropertiesProps](/api/@dxos/client/types/PropertiesProps)&gt; | OperatorFilter&lt;[Properties](/api/@dxos/client/classes/Properties)&gt;</code>


