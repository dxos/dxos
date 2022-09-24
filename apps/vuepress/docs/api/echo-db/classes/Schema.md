# Class: Schema

Wrapper for ECHO Item that represents an `ObjectModel` schema.

## Table of contents

### Constructors

- [constructor](Schema.md#constructor)

### Accessors

- [fields](Schema.md#fields)
- [name](Schema.md#name)

### Methods

- [addField](Schema.md#addfield)
- [deleteField](Schema.md#deletefield)
- [editField](Schema.md#editfield)
- [getField](Schema.md#getfield)
- [validate](Schema.md#validate)

## Constructors

### constructor

• **new Schema**(`_schema`)

#### Parameters

| Name | Type |
| :------ | :------ |
| `_schema` | `ObjectModel` |

#### Defined in

[packages/echo/echo-db/src/api/schema.ts:34](https://github.com/dxos/dxos/blob/6b1348fed/packages/echo/echo-db/src/api/schema.ts#L34)

## Accessors

### fields

• `get` **fields**(): [`SchemaField`](../modules.md#schemafield)[]

#### Returns

[`SchemaField`](../modules.md#schemafield)[]

#### Defined in

[packages/echo/echo-db/src/api/schema.ts:42](https://github.com/dxos/dxos/blob/6b1348fed/packages/echo/echo-db/src/api/schema.ts#L42)

___

### name

• `get` **name**(): `string`

#### Returns

`string`

#### Defined in

[packages/echo/echo-db/src/api/schema.ts:38](https://github.com/dxos/dxos/blob/6b1348fed/packages/echo/echo-db/src/api/schema.ts#L38)

## Methods

### addField

▸ **addField**(`newField`): `Promise`<`void`\>

#### Parameters

| Name | Type |
| :------ | :------ |
| `newField` | [`SchemaField`](../modules.md#schemafield) |

#### Returns

`Promise`<`void`\>

#### Defined in

[packages/echo/echo-db/src/api/schema.ts:74](https://github.com/dxos/dxos/blob/6b1348fed/packages/echo/echo-db/src/api/schema.ts#L74)

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

[packages/echo/echo-db/src/api/schema.ts:94](https://github.com/dxos/dxos/blob/6b1348fed/packages/echo/echo-db/src/api/schema.ts#L94)

___

### editField

▸ **editField**(`currentKey`, `editedField`): `Promise`<`void`\>

#### Parameters

| Name | Type |
| :------ | :------ |
| `currentKey` | `string` |
| `editedField` | [`SchemaField`](../modules.md#schemafield) |

#### Returns

`Promise`<`void`\>

#### Defined in

[packages/echo/echo-db/src/api/schema.ts:84](https://github.com/dxos/dxos/blob/6b1348fed/packages/echo/echo-db/src/api/schema.ts#L84)

___

### getField

▸ **getField**(`key`): `undefined` \| [`SchemaField`](../modules.md#schemafield)

#### Parameters

| Name | Type |
| :------ | :------ |
| `key` | `string` |

#### Returns

`undefined` \| [`SchemaField`](../modules.md#schemafield)

#### Defined in

[packages/echo/echo-db/src/api/schema.ts:46](https://github.com/dxos/dxos/blob/6b1348fed/packages/echo/echo-db/src/api/schema.ts#L46)

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

[packages/echo/echo-db/src/api/schema.ts:51](https://github.com/dxos/dxos/blob/6b1348fed/packages/echo/echo-db/src/api/schema.ts#L51)
