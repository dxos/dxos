# Class `Schema`
Declared in [`packages/core/echo/echo-db/dist/src/packlets/api/schema.d.ts:21`]()


Wrapper for ECHO Item that represents an  `ObjectModel`  schema.

## Constructors
### [`constructor`]()


Returns: [`Schema`](/api/@dxos/client/classes/Schema)

Arguments: 

`_schema`: [`ObjectModel`](/api/@dxos/client/classes/ObjectModel)

## Properties
### [`fields`]()
Type: [`SchemaField`](/api/@dxos/client/types/SchemaField)`[]`
### [`name`]()
Type: `string`

## Methods
### [`addField`]()


Returns: `Promise<void>`

Arguments: 

`newField`: [`SchemaField`](/api/@dxos/client/types/SchemaField)
### [`deleteField`]()


Returns: `Promise<void>`

Arguments: 

`key`: `string`
### [`editField`]()


Returns: `Promise<void>`

Arguments: 

`currentKey`: `string`

`editedField`: [`SchemaField`](/api/@dxos/client/types/SchemaField)
### [`getField`]()


Returns: `undefined | `[`SchemaField`](/api/@dxos/client/types/SchemaField)

Arguments: 

`key`: `string`
### [`validate`]()


Returns: `boolean`

Arguments: 

`model`: [`ObjectModel`](/api/@dxos/client/classes/ObjectModel)