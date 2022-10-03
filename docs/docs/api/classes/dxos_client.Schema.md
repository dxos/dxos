# Class: Schema

[@dxos/client](../modules/dxos_client.md).Schema

Wrapper for ECHO Item that represents an `ObjectModel` schema.

## Constructors

### constructor

**new Schema**(`_schema`)

#### Parameters

| Name | Type |
| :------ | :------ |
| `_schema` | [`ObjectModel`](dxos_client.ObjectModel.md) |

#### Defined in

packages/echo/echo-db/dist/src/api/schema.d.ts:23

## Properties

### \_schema

 `Private` `Readonly` **\_schema**: `any`

#### Defined in

packages/echo/echo-db/dist/src/api/schema.d.ts:22

## Accessors

### fields

`get` **fields**(): [`SchemaField`](../types/dxos_client.SchemaField.md)[]

#### Returns

[`SchemaField`](../types/dxos_client.SchemaField.md)[]

#### Defined in

packages/echo/echo-db/dist/src/api/schema.d.ts:25

___

### name

`get` **name**(): `string`

#### Returns

`string`

#### Defined in

packages/echo/echo-db/dist/src/api/schema.d.ts:24

## Methods

### addField

**addField**(`newField`): `Promise`<`void`\>

#### Parameters

| Name | Type |
| :------ | :------ |
| `newField` | [`SchemaField`](../types/dxos_client.SchemaField.md) |

#### Returns

`Promise`<`void`\>

#### Defined in

packages/echo/echo-db/dist/src/api/schema.d.ts:28

___

### deleteField

**deleteField**(`key`): `Promise`<`void`\>

#### Parameters

| Name | Type |
| :------ | :------ |
| `key` | `string` |

#### Returns

`Promise`<`void`\>

#### Defined in

packages/echo/echo-db/dist/src/api/schema.d.ts:30

___

### editField

**editField**(`currentKey`, `editedField`): `Promise`<`void`\>

#### Parameters

| Name | Type |
| :------ | :------ |
| `currentKey` | `string` |
| `editedField` | [`SchemaField`](../types/dxos_client.SchemaField.md) |

#### Returns

`Promise`<`void`\>

#### Defined in

packages/echo/echo-db/dist/src/api/schema.d.ts:29

___

### getField

**getField**(`key`): `undefined` \| [`SchemaField`](../types/dxos_client.SchemaField.md)

#### Parameters

| Name | Type |
| :------ | :------ |
| `key` | `string` |

#### Returns

`undefined` \| [`SchemaField`](../types/dxos_client.SchemaField.md)

#### Defined in

packages/echo/echo-db/dist/src/api/schema.d.ts:26

___

### validate

**validate**(`model`): `boolean`

#### Parameters

| Name | Type |
| :------ | :------ |
| `model` | [`ObjectModel`](dxos_client.ObjectModel.md) |

#### Returns

`boolean`

#### Defined in

packages/echo/echo-db/dist/src/api/schema.d.ts:27
