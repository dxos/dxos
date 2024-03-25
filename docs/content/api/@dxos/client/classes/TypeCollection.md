# Class `TypeCollection`
<sub>Declared in [packages/core/echo/echo-schema/dist/types/src/type-collection.d.ts:11]()</sub>


Constructed via generated protobuf class.

## Constructors
### [constructor()]()




Returns: <code>[TypeCollection](/api/@dxos/client/classes/TypeCollection)</code>

Arguments: none





## Properties
### [schemas]()
Type: <code>[Schema](/api/@dxos/client/classes/Schema)[]</code>




## Methods
### [getEffectSchema(typename)]()




Returns: <code>undefined | Schema&lt;any, any, never&gt;</code>

Arguments: 

`typename`: <code>string</code>


### [getPrototype(name)]()




Returns: <code>undefined | Prototype</code>

Arguments: 

`name`: <code>string</code>


### [getSchema(name)]()




Returns: <code>undefined | [Schema](/api/@dxos/client/classes/Schema)</code>

Arguments: 

`name`: <code>string</code>


### [isEffectSchemaRegistered(schema)]()




Returns: <code>boolean</code>

Arguments: 

`schema`: <code>Schema&lt;T, T, never&gt;</code>


### [link()]()


Resolve cross-schema references and instantiate schemas.

Returns: <code>void</code>

Arguments: none




### [mergeSchema(schema)]()




Returns: <code>void</code>

Arguments: 

`schema`: <code>[TypeCollection](/api/@dxos/client/classes/TypeCollection)</code>


### [registerEffectSchema(schemaList)]()




Returns: <code>this</code>

Arguments: 

`schemaList`: <code>Schema&lt;T, T, never&gt;[]</code>


### [registerPrototype(proto, schema)]()


Called from generated code.

Returns: <code>void</code>

Arguments: 

`proto`: <code>Prototype</code>

`schema`: <code>SchemaProps</code>


