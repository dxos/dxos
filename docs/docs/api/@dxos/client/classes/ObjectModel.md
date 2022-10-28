# Class `ObjectModel`
> Declared in [`packages/core/echo/object-model/dist/src/object-model.d.ts:24`]()


Object mutation model.

## Constructors
### constructor
```ts
(_meta: ModelMeta&lt;any, any, any&gt;, _itemId: string, _getState: function, _mutationWriter: MutationWriter&lt;ObjectMutationSet&gt;) => [ObjectModel](/api/@dxos/client/classes/ObjectModel)
```

## Properties
### _getState 
Type: function
### update 
Type: Event&lt;Model&lt;ObjectModelState, ObjectMutationSet&gt;&gt;
### meta 
Type: ModelMeta&lt;any, any, any&gt;
### itemId
Type: string
### modelMeta
Type: ModelMeta&lt;any, any, any&gt;
### readOnly
Type: boolean

## Methods
### addToSet
```ts
(key: string, value: any) => Promise&lt;void&gt;
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
(key: string, value: any) => Promise&lt;void&gt;
```
### removeFromSet
```ts
(key: string, value: any) => Promise&lt;void&gt;
```
### set
```ts
(key: string, value: unknown) => Promise&lt;void&gt;
```
### setProperties
```ts
(properties: any) => Promise&lt;void&gt;
```
### setProperty
```ts
(key: string, value: any) => Promise&lt;void&gt;
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
(mutation: ObjectMutationSet) => Promise&lt;MutationWriteReceipt&gt;
```
Writes the raw mutation to the output stream.