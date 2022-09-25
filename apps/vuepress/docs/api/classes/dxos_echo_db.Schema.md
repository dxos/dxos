# Class: Schema

[@dxos/echo-db](../modules/dxos_echo_db.md).Schema

Wrapper for ECHO Item that represents an `ObjectModel` schema.

## Constructors

### constructor

**new Schema**(`_schema`)

#### Parameters

| Name | Type |
| :------ | :------ |
| `_schema` | `ObjectModel` |

#### Defined in

[packages/echo/echo-db/src/api/schema.ts:34](https://github.com/dxos/dxos/blob/db8188dae/packages/echo/echo-db/src/api/schema.ts#L34)

## Accessors

### fields

`get` **fields**(): [`SchemaField`](../types/dxos_echo_db.SchemaField.md)[]

#### Returns

[`SchemaField`](../types/dxos_echo_db.SchemaField.md)[]

#### Defined in

[packages/echo/echo-db/src/api/schema.ts:42](https://github.com/dxos/dxos/blob/db8188dae/packages/echo/echo-db/src/api/schema.ts#L42)

___

### name

`get` **name**(): `string`

#### Returns

`string`

#### Defined in

[packages/echo/echo-db/src/api/schema.ts:38](https://github.com/dxos/dxos/blob/db8188dae/packages/echo/echo-db/src/api/schema.ts#L38)

## Methods

### addField

**addField**(`newField`): `Promise`<`void`\>

#### Parameters

| Name | Type |
| :------ | :------ |
| `newField` | [`SchemaField`](../types/dxos_echo_db.SchemaField.md) |

#### Returns

`Promise`<`void`\>

#### Defined in

[packages/echo/echo-db/src/api/schema.ts:74](https://github.com/dxos/dxos/blob/db8188dae/packages/echo/echo-db/src/api/schema.ts#L74)

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

[packages/echo/echo-db/src/api/schema.ts:94](https://github.com/dxos/dxos/blob/db8188dae/packages/echo/echo-db/src/api/schema.ts#L94)

___

### editField

**editField**(`currentKey`, `editedField`): `Promise`<`void`\>

#### Parameters

| Name | Type |
| :------ | :------ |
| `currentKey` | `string` |
| `editedField` | [`SchemaField`](../types/dxos_echo_db.SchemaField.md) |

#### Returns

`Promise`<`void`\>

#### Defined in

[packages/echo/echo-db/src/api/schema.ts:84](https://github.com/dxos/dxos/blob/db8188dae/packages/echo/echo-db/src/api/schema.ts#L84)

___

### getField

**getField**(`key`): `undefined` \| [`SchemaField`](../types/dxos_echo_db.SchemaField.md)

#### Parameters

| Name | Type |
| :------ | :------ |
| `key` | `string` |

#### Returns

`undefined` \| [`SchemaField`](../types/dxos_echo_db.SchemaField.md)

#### Defined in

[packages/echo/echo-db/src/api/schema.ts:46](https://github.com/dxos/dxos/blob/db8188dae/packages/echo/echo-db/src/api/schema.ts#L46)

___

### validate

**validate**(`model`): `boolean`

#### Parameters

| Name | Type |
| :------ | :------ |
| `model` | `ObjectModel` |

#### Returns

`boolean`

#### Defined in

[packages/echo/echo-db/src/api/schema.ts:51](https://github.com/dxos/dxos/blob/db8188dae/packages/echo/echo-db/src/api/schema.ts#L51)
