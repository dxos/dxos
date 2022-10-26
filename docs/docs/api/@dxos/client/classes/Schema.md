# Class `Schema`
> Declared in [`packages/core/echo/echo-db/dist/src/packlets/api/schema.d.ts:21`]()


Wrapper for ECHO Item that represents an  `ObjectModel`  schema.

## Constructors
### constructor
```ts
(_schema: ObjectModel) => Schema
```

## Properties
### fields
> Type: `SchemaField[]`
<br/>
### name
> Type: `string`
<br/>

## Methods
### addField
```ts
(newField: SchemaField) => Promise<void>
```
### deleteField
```ts
(key: string) => Promise<void>
```
### editField
```ts
(currentKey: string, editedField: SchemaField) => Promise<void>
```
### getField
```ts
(key: string) => undefined | SchemaField
```
### validate
```ts
(model: ObjectModel) => boolean
```