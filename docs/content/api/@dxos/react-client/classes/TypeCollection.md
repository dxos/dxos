# Class `TypeCollection`
<sub>Declared in [packages/core/echo/echo-schema/dist/types/src/type-collection.d.ts:10]()</sub>


Constructed via generated protobuf class.

## Constructors
### [constructor()]()




Returns: <code>[TypeCollection](/api/@dxos/react-client/classes/TypeCollection)</code>

Arguments: none





## Properties
### [schemas]()
Type: <code>[Schema](/api/@dxos/react-client/classes/Schema)[]</code>




## Methods
### [getPrototype(name)]()




Returns: <code>undefined | Prototype</code>

Arguments: 

`name`: <code>string</code>


### [getSchema(name)]()




Returns: <code>undefined | [Schema](/api/@dxos/react-client/classes/Schema)</code>

Arguments: 

`name`: <code>string</code>


### [link()]()


Resolve cross-schema references and instantiate schemas.

Returns: <code>void</code>

Arguments: none




### [mergeSchema(schema)]()




Returns: <code>void</code>

Arguments: 

`schema`: <code>[TypeCollection](/api/@dxos/react-client/classes/TypeCollection)</code>


### [registerPrototype(proto, schema)]()


Called from generated code.

Returns: <code>void</code>

Arguments: 

`proto`: <code>Prototype</code>

`schema`: <code>SchemaProps</code>


