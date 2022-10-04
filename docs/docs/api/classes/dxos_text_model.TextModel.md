# Class: TextModel

[@dxos/text-model](../modules/dxos_text_model.md).TextModel

## Hierarchy

- `Model`<`Doc`, `Mutation`\>

  ↳ **`TextModel`**

## Constructors

### constructor

**new TextModel**(`meta`, `item_id`, `getState`, `writeStream?`)

#### Parameters

| Name | Type |
| :------ | :------ |
| `meta` | `ModelMeta`<`any`, `any`, `any`\> |
| `item_id` | `string` |
| `getState` | () => `Doc` |
| `writeStream?` | `MutationWriter`<`Mutation`\> |

#### Overrides

Model&lt;Doc, Mutation\&gt;.constructor

#### Defined in

[packages/core/echo/text-model/src/text-model.ts:49](https://github.com/dxos/dxos/blob/main/packages/core/echo/text-model/src/text-model.ts#L49)

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

packages/core/echo/model-factory/dist/src/model.d.ts:11

___

### update

 `Readonly` **update**: `Event`<`Model`<`Doc`, `Mutation`\>\>

#### Inherited from

Model.update

#### Defined in

packages/core/echo/model-factory/dist/src/model.d.ts:13

___

### meta

 `Static` **meta**: `ModelMeta`<`any`, `any`, `any`\>

#### Defined in

[packages/core/echo/text-model/src/text-model.ts:42](https://github.com/dxos/dxos/blob/main/packages/core/echo/text-model/src/text-model.ts#L42)

## Accessors

### content

`get` **content**(): `YXmlFragment`

#### Returns

`YXmlFragment`

#### Defined in

[packages/core/echo/text-model/src/text-model.ts:59](https://github.com/dxos/dxos/blob/main/packages/core/echo/text-model/src/text-model.ts#L59)

___

### doc

`get` **doc**(): `Doc`

#### Returns

`Doc`

#### Defined in

[packages/core/echo/text-model/src/text-model.ts:55](https://github.com/dxos/dxos/blob/main/packages/core/echo/text-model/src/text-model.ts#L55)

___

### item_id

`get` **item_id**(): `string`

#### Returns

`string`

#### Inherited from

Model.item_id

#### Defined in

packages/core/echo/model-factory/dist/src/model.d.ts:27

___

### modelMeta

`get` **modelMeta**(): `ModelMeta`<`any`, `any`, `any`\>

#### Returns

`ModelMeta`<`any`, `any`, `any`\>

#### Inherited from

Model.modelMeta

#### Defined in

packages/core/echo/model-factory/dist/src/model.d.ts:26

___

### readOnly

`get` **readOnly**(): `boolean`

#### Returns

`boolean`

#### Inherited from

Model.readOnly

#### Defined in

packages/core/echo/model-factory/dist/src/model.d.ts:28

___

### textContent

`get` **textContent**(): `string`

#### Returns

`string`

#### Defined in

[packages/core/echo/text-model/src/text-model.ts:64](https://github.com/dxos/dxos/blob/main/packages/core/echo/text-model/src/text-model.ts#L64)

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

[packages/core/echo/text-model/src/text-model.ts:68](https://github.com/dxos/dxos/blob/main/packages/core/echo/text-model/src/text-model.ts#L68)

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

[packages/core/echo/text-model/src/text-model.ts:100](https://github.com/dxos/dxos/blob/main/packages/core/echo/text-model/src/text-model.ts#L100)

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

[packages/core/echo/text-model/src/text-model.ts:82](https://github.com/dxos/dxos/blob/main/packages/core/echo/text-model/src/text-model.ts#L82)

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

[packages/core/echo/text-model/src/text-model.ts:78](https://github.com/dxos/dxos/blob/main/packages/core/echo/text-model/src/text-model.ts#L78)

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

[packages/core/echo/text-model/src/text-model.ts:137](https://github.com/dxos/dxos/blob/main/packages/core/echo/text-model/src/text-model.ts#L137)

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

[packages/core/echo/text-model/src/text-model.ts:141](https://github.com/dxos/dxos/blob/main/packages/core/echo/text-model/src/text-model.ts#L141)

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

packages/core/echo/model-factory/dist/src/model.d.ts:29

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

packages/core/echo/model-factory/dist/src/model.d.ts:22

___

### toString

**toString**(): `string`

#### Returns

`string`

#### Inherited from

Model.toString

#### Defined in

packages/core/echo/model-factory/dist/src/model.d.ts:21

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

packages/core/echo/model-factory/dist/src/model.d.ts:33
