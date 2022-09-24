# Class: Schema

[@dxos/client](../modules/dxos_client.md).Schema

Wrapper for ECHO Item that represents an `ObjectModel` schema.

## Table of contents

### Constructors

- [constructor](dxos_client.Schema.md#constructor)

### Properties

- [\_schema](dxos_client.Schema.md#_schema)

### Accessors

- [fields](dxos_client.Schema.md#fields)
- [name](dxos_client.Schema.md#name)

### Methods

- [addField](dxos_client.Schema.md#addfield)
- [deleteField](dxos_client.Schema.md#deletefield)
- [editField](dxos_client.Schema.md#editfield)
- [getField](dxos_client.Schema.md#getfield)
- [validate](dxos_client.Schema.md#validate)

## Constructors

### constructor

• **new Schema**(`_schema`)

#### Parameters

| Name | Type |
| :------ | :------ |
| `_schema` | [`ObjectModel`](dxos_client.ObjectModel.md) |

#### Defined in

packages/echo/echo-db/dist/src/api/schema.d.ts:23

## Properties

### \_schema

• `Private` `Readonly` **\_schema**: `any`

#### Defined in

packages/echo/echo-db/dist/src/api/schema.d.ts:22

## Accessors

### fields

• `get` **fields**(): [`SchemaField`](../modules/dxos_client.md#schemafield)[]

#### Returns

[`SchemaField`](../modules/dxos_client.md#schemafield)[]

#### Defined in

packages/echo/echo-db/dist/src/api/schema.d.ts:25

___

### name

• `get` **name**(): `string`

#### Returns

`string`

#### Defined in

packages/echo/echo-db/dist/src/api/schema.d.ts:24

## Methods

### addField

▸ **addField**(`newField`): `Promise`<`void`\>

#### Parameters

| Name | Type |
| :------ | :------ |
| `newField` | [`SchemaField`](../modules/dxos_client.md#schemafield) |

#### Returns

`Promise`<`void`\>

#### Defined in

packages/echo/echo-db/dist/src/api/schema.d.ts:28

___

### deleteField

▸ **deleteField**(`key`): `Promise`<`void`\>

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

▸ **editField**(`currentKey`, `editedField`): `Promise`<`void`\>

#### Parameters

| Name | Type |
| :------ | :------ |
| `currentKey` | `string` |
| `editedField` | [`SchemaField`](../modules/dxos_client.md#schemafield) |

#### Returns

`Promise`<`void`\>

#### Defined in

packages/echo/echo-db/dist/src/api/schema.d.ts:29

___

### getField

▸ **getField**(`key`): `undefined` \| [`SchemaField`](../modules/dxos_client.md#schemafield)

#### Parameters

| Name | Type |
| :------ | :------ |
| `key` | `string` |

#### Returns

`undefined` \| [`SchemaField`](../modules/dxos_client.md#schemafield)

#### Defined in

packages/echo/echo-db/dist/src/api/schema.d.ts:26

___

### validate

▸ **validate**(`model`): `boolean`

#### Parameters

| Name | Type |
| :------ | :------ |
| `model` | [`ObjectModel`](dxos_client.ObjectModel.md) |

#### Returns

`boolean`

#### Defined in

packages/echo/echo-db/dist/src/api/schema.d.ts:27
