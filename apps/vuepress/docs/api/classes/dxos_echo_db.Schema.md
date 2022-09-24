# Class: Schema

[@dxos/echo-db](../modules/dxos_echo_db.md).Schema

Wrapper for ECHO Item that represents an `ObjectModel` schema.

## Table of contents

### Constructors

- [constructor](dxos_echo_db.Schema.md#constructor)

### Accessors

- [fields](dxos_echo_db.Schema.md#fields)
- [name](dxos_echo_db.Schema.md#name)

### Methods

- [addField](dxos_echo_db.Schema.md#addfield)
- [deleteField](dxos_echo_db.Schema.md#deletefield)
- [editField](dxos_echo_db.Schema.md#editfield)
- [getField](dxos_echo_db.Schema.md#getfield)
- [validate](dxos_echo_db.Schema.md#validate)

## Constructors

### constructor

• **new Schema**(`_schema`)

#### Parameters

| Name | Type |
| :------ | :------ |
| `_schema` | `ObjectModel` |

#### Defined in

[packages/echo/echo-db/src/api/schema.ts:34](https://github.com/dxos/dxos/blob/32ae9b579/packages/echo/echo-db/src/api/schema.ts#L34)

## Accessors

### fields

• `get` **fields**(): [`SchemaField`](../modules/dxos_echo_db.md#schemafield)[]

#### Returns

[`SchemaField`](../modules/dxos_echo_db.md#schemafield)[]

#### Defined in

[packages/echo/echo-db/src/api/schema.ts:42](https://github.com/dxos/dxos/blob/32ae9b579/packages/echo/echo-db/src/api/schema.ts#L42)

___

### name

• `get` **name**(): `string`

#### Returns

`string`

#### Defined in

[packages/echo/echo-db/src/api/schema.ts:38](https://github.com/dxos/dxos/blob/32ae9b579/packages/echo/echo-db/src/api/schema.ts#L38)

## Methods

### addField

▸ **addField**(`newField`): `Promise`<`void`\>

#### Parameters

| Name | Type |
| :------ | :------ |
| `newField` | [`SchemaField`](../modules/dxos_echo_db.md#schemafield) |

#### Returns

`Promise`<`void`\>

#### Defined in

[packages/echo/echo-db/src/api/schema.ts:74](https://github.com/dxos/dxos/blob/32ae9b579/packages/echo/echo-db/src/api/schema.ts#L74)

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

[packages/echo/echo-db/src/api/schema.ts:94](https://github.com/dxos/dxos/blob/32ae9b579/packages/echo/echo-db/src/api/schema.ts#L94)

___

### editField

▸ **editField**(`currentKey`, `editedField`): `Promise`<`void`\>

#### Parameters

| Name | Type |
| :------ | :------ |
| `currentKey` | `string` |
| `editedField` | [`SchemaField`](../modules/dxos_echo_db.md#schemafield) |

#### Returns

`Promise`<`void`\>

#### Defined in

[packages/echo/echo-db/src/api/schema.ts:84](https://github.com/dxos/dxos/blob/32ae9b579/packages/echo/echo-db/src/api/schema.ts#L84)

___

### getField

▸ **getField**(`key`): `undefined` \| [`SchemaField`](../modules/dxos_echo_db.md#schemafield)

#### Parameters

| Name | Type |
| :------ | :------ |
| `key` | `string` |

#### Returns

`undefined` \| [`SchemaField`](../modules/dxos_echo_db.md#schemafield)

#### Defined in

[packages/echo/echo-db/src/api/schema.ts:46](https://github.com/dxos/dxos/blob/32ae9b579/packages/echo/echo-db/src/api/schema.ts#L46)

___

### validate

▸ **validate**(`model`): `boolean`

#### Parameters

| Name | Type |
| :------ | :------ |
| `model` | `ObjectModel` |

#### Returns

`boolean`

#### Defined in

[packages/echo/echo-db/src/api/schema.ts:51](https://github.com/dxos/dxos/blob/32ae9b579/packages/echo/echo-db/src/api/schema.ts#L51)
