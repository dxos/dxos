# Class `Schema`
> Declared in [`packages/core/echo/echo-db/dist/src/packlets/api/schema.d.ts:21`]()


Wrapper for ECHO Item that represents an  `ObjectModel`  schema.

## Constructors
### constructor
```ts
(_schema: [ObjectModel](/api/@dxos/client/classes/ObjectModel)) => [Schema](/api/@dxos/client/classes/Schema)
```

## Properties
### fields
Type: [SchemaField](/api/@dxos/client/types/SchemaField)[]
### name
Type: string

## Methods
### addField
```ts
(newField: [SchemaField](/api/@dxos/client/types/SchemaField)) => Promise<void>
```
### deleteField
```ts
(key: string) => Promise<void>
```
### editField
```ts
(currentKey: string, editedField: [SchemaField](/api/@dxos/client/types/SchemaField)) => Promise<void>
```
### getField
```ts
(key: string) => undefined | [SchemaField](/api/@dxos/client/types/SchemaField)
```
### validate
```ts
(model: [ObjectModel](/api/@dxos/client/classes/ObjectModel)) => boolean
```