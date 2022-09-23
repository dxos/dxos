---
id: "dxos_text_model.TextModel"
title: "Class: TextModel"
sidebar_label: "TextModel"
custom_edit_url: null
---

[@dxos/text-model](../modules/dxos_text_model.md).TextModel

## Hierarchy

- `Model`<`Doc`, `Mutation`\>

  ↳ **`TextModel`**

## Constructors

### constructor

• **new TextModel**(`meta`, `itemId`, `getState`, `writeStream?`)

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

[packages/echo/text-model/src/text-model.ts:51](https://github.com/dxos/protocols/blob/6f4c34af3/packages/echo/text-model/src/text-model.ts#L51)

## Properties

### \_getState

• `Protected` `Readonly` **\_getState**: () => `Doc`

#### Type declaration

▸ (): `Doc`

##### Returns

`Doc`

#### Inherited from

Model.\_getState

#### Defined in

packages/echo/model-factory/dist/src/model.d.ts:11

___

### update

• `Readonly` **update**: `Event`<`Model`<`Doc`, `Mutation`\>\>

#### Inherited from

Model.update

#### Defined in

packages/echo/model-factory/dist/src/model.d.ts:13

___

### meta

▪ `Static` **meta**: `ModelMeta`<`any`, `any`, `any`\>

#### Defined in

[packages/echo/text-model/src/text-model.ts:44](https://github.com/dxos/protocols/blob/6f4c34af3/packages/echo/text-model/src/text-model.ts#L44)

## Accessors

### content

• `get` **content**(): `YXmlFragment`

#### Returns

`YXmlFragment`

#### Defined in

[packages/echo/text-model/src/text-model.ts:61](https://github.com/dxos/protocols/blob/6f4c34af3/packages/echo/text-model/src/text-model.ts#L61)

___

### doc

• `get` **doc**(): `Doc`

#### Returns

`Doc`

#### Defined in

[packages/echo/text-model/src/text-model.ts:57](https://github.com/dxos/protocols/blob/6f4c34af3/packages/echo/text-model/src/text-model.ts#L57)

___

### itemId

• `get` **itemId**(): `string`

#### Returns

`string`

#### Inherited from

Model.itemId

#### Defined in

packages/echo/model-factory/dist/src/model.d.ts:27

___

### modelMeta

• `get` **modelMeta**(): `ModelMeta`<`any`, `any`, `any`\>

#### Returns

`ModelMeta`<`any`, `any`, `any`\>

#### Inherited from

Model.modelMeta

#### Defined in

packages/echo/model-factory/dist/src/model.d.ts:26

___

### readOnly

• `get` **readOnly**(): `boolean`

#### Returns

`boolean`

#### Inherited from

Model.readOnly

#### Defined in

packages/echo/model-factory/dist/src/model.d.ts:28

___

### textContent

• `get` **textContent**(): `string`

#### Returns

`string`

#### Defined in

[packages/echo/text-model/src/text-model.ts:66](https://github.com/dxos/protocols/blob/6f4c34af3/packages/echo/text-model/src/text-model.ts#L66)

## Methods

### \_handleDocUpdated

▸ `Private` **_handleDocUpdated**(`update`, `origin`): `Promise`<`void`\>

#### Parameters

| Name | Type |
| :------ | :------ |
| `update` | `Uint8Array` |
| `origin` | `any` |

#### Returns

`Promise`<`void`\>

#### Defined in

[packages/echo/text-model/src/text-model.ts:70](https://github.com/dxos/protocols/blob/6f4c34af3/packages/echo/text-model/src/text-model.ts#L70)

___

### \_insertInner

▸ `Private` **_insertInner**(`node`, `index`, `text`): `number` \| ``true``

#### Parameters

| Name | Type |
| :------ | :------ |
| `node` | `unknown` |
| `index` | `number` |
| `text` | `string` |

#### Returns

`number` \| ``true``

#### Defined in

[packages/echo/text-model/src/text-model.ts:102](https://github.com/dxos/protocols/blob/6f4c34af3/packages/echo/text-model/src/text-model.ts#L102)

___

### \_textContentInner

▸ `Private` **_textContentInner**(`node`): `string`

#### Parameters

| Name | Type |
| :------ | :------ |
| `node` | `any` |

#### Returns

`string`

#### Defined in

[packages/echo/text-model/src/text-model.ts:84](https://github.com/dxos/protocols/blob/6f4c34af3/packages/echo/text-model/src/text-model.ts#L84)

___

### \_transact

▸ `Private` **_transact**(`fn`): `void`

#### Parameters

| Name | Type |
| :------ | :------ |
| `fn` | () => `void` |

#### Returns

`void`

#### Defined in

[packages/echo/text-model/src/text-model.ts:80](https://github.com/dxos/protocols/blob/6f4c34af3/packages/echo/text-model/src/text-model.ts#L80)

___

### insert

▸ **insert**(`text`, `index`): `void`

#### Parameters

| Name | Type |
| :------ | :------ |
| `text` | `string` |
| `index` | `number` |

#### Returns

`void`

#### Defined in

[packages/echo/text-model/src/text-model.ts:139](https://github.com/dxos/protocols/blob/6f4c34af3/packages/echo/text-model/src/text-model.ts#L139)

___

### insertTextNode

▸ **insertTextNode**(`text`, `index?`): `void`

#### Parameters

| Name | Type | Default value |
| :------ | :------ | :------ |
| `text` | `string` | `undefined` |
| `index` | `number` | `0` |

#### Returns

`void`

#### Defined in

[packages/echo/text-model/src/text-model.ts:143](https://github.com/dxos/protocols/blob/6f4c34af3/packages/echo/text-model/src/text-model.ts#L143)

___

### subscribe

▸ **subscribe**(`listener`): () => `void`

#### Parameters

| Name | Type |
| :------ | :------ |
| `listener` | (`result`: [`TextModel`](dxos_text_model.TextModel.md)) => `void` |

#### Returns

`fn`

▸ (): `void`

##### Returns

`void`

#### Inherited from

Model.subscribe

#### Defined in

packages/echo/model-factory/dist/src/model.d.ts:29

___

### toJSON

▸ **toJSON**(): `Object`

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

▸ **toString**(): `string`

#### Returns

`string`

#### Inherited from

Model.toString

#### Defined in

packages/echo/model-factory/dist/src/model.d.ts:21

___

### write

▸ `Protected` **write**(`mutation`): `Promise`<`MutationWriteReceipt`\>

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
