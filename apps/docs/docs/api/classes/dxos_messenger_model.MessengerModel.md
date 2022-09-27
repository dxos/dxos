---
id: "dxos_messenger_model.MessengerModel"
title: "Class: MessengerModel"
sidebar_label: "MessengerModel"
custom_edit_url: null
---

[@dxos/messenger-model](../modules/dxos_messenger_model.md).MessengerModel

MessengerModel is a simple model which represents a chat as an array of Messages.

## Hierarchy

- `Model`<`Message`[], `Message`\>

  ↳ **`MessengerModel`**

## Constructors

### constructor

• **new MessengerModel**(`_meta`, `_itemId`, `_getState`, `_mutationWriter?`)

#### Parameters

| Name | Type | Description |
| :------ | :------ | :------ |
| `_meta` | `ModelMeta`<`any`, `any`, `any`\> | Metadata definitions. |
| `_itemId` | `string` | Parent item. |
| `_getState` | () => `Message`[] | Retrieves the underlying state object. |
| `_mutationWriter?` | `MutationWriter`<`Message`\> | Output mutation stream (unless read-only). |

#### Inherited from

Model<Message[], Message\>.constructor

#### Defined in

packages/echo/model-factory/dist/src/model.d.ts:20

## Properties

### \_getState

• `Protected` `Readonly` **\_getState**: () => `Message`[]

#### Type declaration

▸ (): `Message`[]

##### Returns

`Message`[]

#### Inherited from

Model.\_getState

#### Defined in

packages/echo/model-factory/dist/src/model.d.ts:11

___

### update

• `Readonly` **update**: `Event`<`Model`<`Message`[], `Message`\>\>

#### Inherited from

Model.update

#### Defined in

packages/echo/model-factory/dist/src/model.d.ts:13

___

### meta

▪ `Static` **meta**: `ModelMeta`<`any`, `any`, `any`\>

#### Defined in

[packages/echo/messenger-model/src/model.ts:34](https://github.com/dxos/protocols/blob/c793f0fed/packages/echo/messenger-model/src/model.ts#L34)

## Accessors

### itemId

• `get` **itemId**(): `string`

#### Returns

`string`

#### Inherited from

Model.itemId

#### Defined in

packages/echo/model-factory/dist/src/model.d.ts:27

___

### messages

• `get` **messages**(): `Message`[]

#### Returns

`Message`[]

#### Defined in

[packages/echo/messenger-model/src/model.ts:40](https://github.com/dxos/protocols/blob/c793f0fed/packages/echo/messenger-model/src/model.ts#L40)

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

## Methods

### sendMessage

▸ **sendMessage**(`message`): `Promise`<`void`\>

#### Parameters

| Name | Type |
| :------ | :------ |
| `message` | `Pick`<`Message`, ``"text"`` \| ``"sender"``\> |

#### Returns

`Promise`<`void`\>

#### Defined in

[packages/echo/messenger-model/src/model.ts:44](https://github.com/dxos/protocols/blob/c793f0fed/packages/echo/messenger-model/src/model.ts#L44)

___

### subscribe

▸ **subscribe**(`listener`): () => `void`

#### Parameters

| Name | Type |
| :------ | :------ |
| `listener` | (`result`: [`MessengerModel`](dxos_messenger_model.MessengerModel.md)) => `void` |

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
| `mutation` | `Message` |

#### Returns

`Promise`<`MutationWriteReceipt`\>

#### Inherited from

Model.write

#### Defined in

packages/echo/model-factory/dist/src/model.d.ts:33
