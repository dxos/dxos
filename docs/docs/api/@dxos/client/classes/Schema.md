# Class `Schema`
> Declared in [`packages/core/echo/echo-db/dist/src/packlets/api/schema.d.ts:21`]()


Wrapper for ECHO Item that represents an  `ObjectModel`  schema.

## Constructors
```ts
new Schema (_schema: ObjectModel) => Schema
```

## Properties
### `fields:  get SchemaField[]`
### `name:  get string`

## Functions
```ts
addField (newField: SchemaField) => Promise<void>
```
```ts
deleteField (key: string) => Promise<void>
```
```ts
editField (currentKey: string, editedField: SchemaField) => Promise<void>
```
```ts
getField (key: string) => undefined | SchemaField
```
```ts
validate (model: ObjectModel) => boolean
```