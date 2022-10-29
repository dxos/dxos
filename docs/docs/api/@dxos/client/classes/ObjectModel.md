# Class `ObjectModel`
Declared in [`packages/core/echo/object-model/dist/src/object-model.d.ts:24`]()


Object mutation model.

## Constructors
### [`constructor`]()


Returns: [`ObjectModel`](/api/@dxos/client/classes/ObjectModel)

Arguments: 

`_meta`: `ModelMeta<any, any, any>`

`_itemId`: `string`

`_getState`: `function`

`_mutationWriter`: `MutationWriter<ObjectMutationSet>`

## Properties
### [`_getState`]()
Type: `function`
### [`update`]()
Type: `Event<Model<ObjectModelState, ObjectMutationSet>>`
### [`meta`]()
Type: `ModelMeta<any, any, any>`
### [`itemId`]()
Type: `string`
### [`modelMeta`]()
Type: `ModelMeta<any, any, any>`
### [`readOnly`]()
Type: `boolean`

## Methods
### [`addToSet`]()


Returns: `Promise<void>`

Arguments: 

`key`: `string`

`value`: `any`
### [`builder`]()


Returns: `MutationBuilder`

Arguments: none
### [`get`]()


Returns: `any`

Arguments: 

`key`: `string`

`defaultValue`: `unknown`
### [`getProperty`]()


Returns: `any`

Arguments: 

`key`: `string`

`defaultValue`: `any`
### [`pushToArray`]()


Returns: `Promise<void>`

Arguments: 

`key`: `string`

`value`: `any`
### [`removeFromSet`]()


Returns: `Promise<void>`

Arguments: 

`key`: `string`

`value`: `any`
### [`set`]()


Returns: `Promise<void>`

Arguments: 

`key`: `string`

`value`: `unknown`
### [`setProperties`]()


Returns: `Promise<void>`

Arguments: 

`properties`: `any`
### [`setProperty`]()


Returns: `Promise<void>`

Arguments: 

`key`: `string`

`value`: `any`
### [`subscribe`]()


Returns: `function`

Arguments: 

`listener`: `function`
### [`toJSON`]()


Returns: `object`

Arguments: none
### [`toObject`]()


Returns an immutable object.

Returns: `ObjectModelState`

Arguments: none
### [`toString`]()


Returns: `string`

Arguments: none
### [`write`]()


Writes the raw mutation to the output stream.

Returns: `Promise<MutationWriteReceipt>`

Arguments: 

`mutation`: `ObjectMutationSet`