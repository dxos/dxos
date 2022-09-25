# Class: TextModel

[@dxos/text-model](../modules/dxos_text_model.md).TextModel

## Hierarchy

- `Model`<`Doc`, `Mutation`\>

  ↳ **`TextModel`**

## Constructors

### constructor

**new TextModel**(`meta`, `itemId`, `getState`, `writeStream?`)

#### Parameters

| Name | Type |
| :------ | :------ |
| `meta` | `ModelMeta`<`any`, `any`, `any`\> |
| `itemId` | `string` |
| `getState` | () => `Doc` |
| `writeStream?` | `MutationWriter`<`Mutation`\> |

#### Overrides

Model&lt;Doc, Mutation\&gt;.constructor

#### Defined in

[packages/echo/text-model/src/text-model.ts:50](https://github.com/dxos/dxos/blob/db8188dae/packages/echo/text-model/src/text-model.ts#L50)

## Properties

### \_getState

 `Protected` `Readonly` **\_getState**: () => `Doc`

#### Type declaration

(): `Doc`

##### Returns

`Doc`

#### Inherited from

Model.\_getState

#### Defined in

packages/echo/model-factory/dist/src/model.d.ts:11

___

### update

 `Readonly` **update**: `Event`<`Model`<`Doc`, `Mutation`\>\>

#### Inherited from

Model.update

#### Defined in

packages/echo/model-factory/dist/src/model.d.ts:13

___

### meta

 `Static` **meta**: `ModelMeta`<`any`, `any`, `any`\>

#### Defined in

[packages/echo/text-model/src/text-model.ts:43](https://github.com/dxos/dxos/blob/db8188dae/packages/echo/text-model/src/text-model.ts#L43)

## Accessors

### content

`get` **content**(): `YXmlFragment`

#### Returns

`YXmlFragment`

#### Defined in

[packages/echo/text-model/src/text-model.ts:60](https://github.com/dxos/dxos/blob/db8188dae/packages/echo/text-model/src/text-model.ts#L60)

___

### doc

`get` **doc**(): `Doc`

#### Returns

`Doc`

#### Defined in

[packages/echo/text-model/src/text-model.ts:56](https://github.com/dxos/dxos/blob/db8188dae/packages/echo/text-model/src/text-model.ts#L56)

___

### itemId

`get` **itemId**(): `string`

#### Returns

`string`

#### Inherited from

Model.itemId

#### Defined in

packages/echo/model-factory/dist/src/model.d.ts:27

___

### modelMeta

`get` **modelMeta**(): `ModelMeta`<`any`, `any`, `any`\>

#### Returns

`ModelMeta`<`any`, `any`, `any`\>

#### Inherited from

Model.modelMeta

#### Defined in

packages/echo/model-factory/dist/src/model.d.ts:26

___

### readOnly

`get` **readOnly**(): `boolean`

#### Returns

`boolean`

#### Inherited from

Model.readOnly

#### Defined in

packages/echo/model-factory/dist/src/model.d.ts:28

___

### textContent

`get` **textContent**(): `string`

#### Returns

`string`

#### Defined in

[packages/echo/text-model/src/text-model.ts:65](https://github.com/dxos/dxos/blob/db8188dae/packages/echo/text-model/src/text-model.ts#L65)

## Methods

### \_handleDocUpdated

`Private` **_handleDocUpdated**(`update`, `origin`): `Promise`<`void`\>

#### Parameters

| Name | Type |
| :------ | :------ |
| `update` | `Uint8Array` |
| `origin` | `any` |

#### Returns

`Promise`<`void`\>

#### Defined in

[packages/echo/text-model/src/text-model.ts:69](https://github.com/dxos/dxos/blob/db8188dae/packages/echo/text-model/src/text-model.ts#L69)

___

### \_insertInner

`Private` **_insertInner**(`node`, `index`, `text`): `number` \| ``true``

#### Parameters

| Name | Type |
| :------ | :------ |
| `node` | `unknown` |
| `index` | `number` |
| `text` | `string` |

#### Returns

`number` \| ``true``

#### Defined in

[packages/echo/text-model/src/text-model.ts:101](https://github.com/dxos/dxos/blob/db8188dae/packages/echo/text-model/src/text-model.ts#L101)

___

### \_textContentInner

`Private` **_textContentInner**(`node`): `string`

#### Parameters

| Name | Type |
| :------ | :------ |
| `node` | `any` |

#### Returns

`string`

#### Defined in

[packages/echo/text-model/src/text-model.ts:83](https://github.com/dxos/dxos/blob/db8188dae/packages/echo/text-model/src/text-model.ts#L83)

___

### \_transact

`Private` **_transact**(`fn`): `void`

#### Parameters

| Name | Type |
| :------ | :------ |
| `fn` | () => `void` |

#### Returns

`void`

#### Defined in

[packages/echo/text-model/src/text-model.ts:79](https://github.com/dxos/dxos/blob/db8188dae/packages/echo/text-model/src/text-model.ts#L79)

___

### insert

**insert**(`text`, `index`): `void`

#### Parameters

| Name | Type |
| :------ | :------ |
| `text` | `string` |
| `index` | `number` |

#### Returns

`void`

#### Defined in

[packages/echo/text-model/src/text-model.ts:138](https://github.com/dxos/dxos/blob/db8188dae/packages/echo/text-model/src/text-model.ts#L138)

___

### insertTextNode

**insertTextNode**(`text`, `index?`): `void`

#### Parameters

| Name | Type | Default value |
| :------ | :------ | :------ |
| `text` | `string` | `undefined` |
| `index` | `number` | `0` |

#### Returns

`void`

#### Defined in

[packages/echo/text-model/src/text-model.ts:142](https://github.com/dxos/dxos/blob/db8188dae/packages/echo/text-model/src/text-model.ts#L142)

___

### subscribe

**subscribe**(`listener`): () => `void`

#### Parameters

| Name | Type |
| :------ | :------ |
| `listener` | (`result`: [`TextModel`](dxos_text_model.TextModel.md)) => `void` |

#### Returns

`fn`

(): `void`

##### Returns

`void`

#### Inherited from

Model.subscribe

#### Defined in

packages/echo/model-factory/dist/src/model.d.ts:29

___

### toJSON

**toJSON**(): `Object`

#### Returns

`Object`

| Name | Type |
| :------ | :------ |
| `id` | `string` |
| `type` | `string` |

#### Inherited from

Model.toJSON

#### Defined in

packages/echo/model-factory/dist/src/model.d.ts:22

___

### toString

**toString**(): `string`

#### Returns

`string`

#### Inherited from

Model.toString

#### Defined in

packages/echo/model-factory/dist/src/model.d.ts:21

___

### write

`Protected` **write**(`mutation`): `Promise`<`MutationWriteReceipt`\>

Writes the raw mutation to the output stream.

#### Parameters

| Name | Type |
| :------ | :------ |
| `mutation` | `Mutation` |

#### Returns

`Promise`<`MutationWriteReceipt`\>

#### Inherited from

Model.write

#### Defined in

packages/echo/model-factory/dist/src/model.d.ts:33
