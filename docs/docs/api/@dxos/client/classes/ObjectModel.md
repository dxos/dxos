# Class `ObjectModel`
> Declared in [`packages/core/echo/object-model/dist/src/object-model.d.ts:24`]()


Object mutation model.

## Constructors
```ts
new ObjectModel (_meta: ModelMeta<any, any, any>, _itemId: string, _getState: function, _mutationWriter: MutationWriter<ObjectMutationSet>) => ObjectModel
```

## Properties
### `_getState: function`
### `update: Event<Model<ObjectModelState, ObjectMutationSet>>`
### `meta: ModelMeta<any, any, any>`
### `itemId:  get string`
### `modelMeta:  get ModelMeta<any, any, any>`
### `readOnly:  get boolean`

## Functions
```ts
addToSet (key: string, value: any) => Promise<void>
```
```ts
builder () => MutationBuilder
```
```ts
get (key: string, defaultValue: unknown) => any
```
```ts
getProperty (key: string, defaultValue: any) => any
```
```ts
pushToArray (key: string, value: any) => Promise<void>
```
```ts
removeFromSet (key: string, value: any) => Promise<void>
```
```ts
set (key: string, value: unknown) => Promise<void>
```
```ts
setProperties (properties: any) => Promise<void>
```
```ts
setProperty (key: string, value: any) => Promise<void>
```
```ts
subscribe (listener: function) => function
```
```ts
toJSON () => object
```
```ts
toObject () => ObjectModelState
```
Returns an immutable object.
```ts
toString () => string
```
```ts
write (mutation: ObjectMutationSet) => Promise<MutationWriteReceipt>
```
Writes the raw mutation to the output stream.