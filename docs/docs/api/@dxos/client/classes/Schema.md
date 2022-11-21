# Class `Schema`
<sub>Declared in [packages/core/echo/echo-db/dist/src/packlets/api/schema.d.ts:21]()</sub>


Wrapper for ECHO Item that represents an  `ObjectModel`  schema.

## Constructors
### [constructor(_schema)]()


Returns: <code>[Schema](/api/@dxos/client/classes/Schema)</code>

Arguments: 

`_schema`: <code>[ObjectModel](/api/@dxos/client/classes/ObjectModel)</code>

## Properties
### [fields]()
Type: <code>[SchemaField](/api/@dxos/client/types/SchemaField)[]</code>
### [name]()
Type: <code>string</code>

## Methods
### [addField(newField)]()


Returns: <code>Promise&lt;void&gt;</code>

Arguments: 

`newField`: <code>[SchemaField](/api/@dxos/client/types/SchemaField)</code>
### [deleteField(key)]()


Returns: <code>Promise&lt;void&gt;</code>

Arguments: 

`key`: <code>string</code>
### [editField(currentKey, editedField)]()


Returns: <code>Promise&lt;void&gt;</code>

Arguments: 

`currentKey`: <code>string</code>

`editedField`: <code>[SchemaField](/api/@dxos/client/types/SchemaField)</code>
### [getField(key)]()


Returns: <code>undefined | [SchemaField](/api/@dxos/client/types/SchemaField)</code>

Arguments: 

`key`: <code>string</code>
### [validate(model)]()


Returns: <code>boolean</code>

Arguments: 

`model`: <code>[ObjectModel](/api/@dxos/client/classes/ObjectModel)</code>