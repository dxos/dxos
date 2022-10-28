# Class `ObjectModel`
> Declared in [`packages/core/echo/object-model/dist/src/object-model.d.ts:24`]()


Object mutation model.

## Constructors
### constructor
```ts
(_meta: ModelMeta<any, any, any>, _itemId: string, _getState: function, _mutationWriter: MutationWriter<ObjectMutationSet>) => [ObjectModel](/api/@dxos/client/classes/ObjectModel)
```

## Properties
### _getState 
Type: function
### update 
Type: Event<Model<ObjectModelState, ObjectMutationSet>>
### meta 
Type: ModelMeta<any, any, any>
### itemId
Type: string
### modelMeta
Type: ModelMeta<any, any, any>
### readOnly
Type: boolean

## Methods
### addToSet
```ts
(key: string, value: any) => Promise<void>
```
### builder
```ts
() => MutationBuilder
```
### get
```ts
(key: string, defaultValue: unknown) => any
```
### getProperty
```ts
(key: string, defaultValue: any) => any
```
### pushToArray
```ts
(key: string, value: any) => Promise<void>
```
### removeFromSet
```ts
(key: string, value: any) => Promise<void>
```
### set
```ts
(key: string, value: unknown) => Promise<void>
```
### setProperties
```ts
(properties: any) => Promise<void>
```
### setProperty
```ts
(key: string, value: any) => Promise<void>
```
### subscribe
```ts
(listener: function) => function
```
### toJSON
```ts
() => object
```
### toObject
```ts
() => ObjectModelState
```
Returns an immutable object.
### toString
```ts
() => string
```
### write
```ts
(mutation: ObjectMutationSet) => Promise<MutationWriteReceipt>
```
Writes the raw mutation to the output stream.