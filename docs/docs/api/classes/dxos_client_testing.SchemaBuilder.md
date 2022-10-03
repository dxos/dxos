# Class: SchemaBuilder

[@dxos/client-testing](../modules/dxos_client_testing.md).SchemaBuilder

## Constructors

### constructor

**new SchemaBuilder**(`_database`)

#### Parameters

| Name | Type |
| :------ | :------ |
| `_database` | `Database` |

#### Defined in

[packages/sdk/client-testing/src/builders/schemaBuilder.ts:81](https://github.com/dxos/dxos/blob/main/packages/sdk/client-testing/src/builders/schemaBuilder.ts#L81)

## Accessors

### defaultSchemas

`get` **defaultSchemas**(): `Object`

#### Returns

`Object`

#### Defined in

[packages/sdk/client-testing/src/builders/schemaBuilder.ts:85](https://github.com/dxos/dxos/blob/main/packages/sdk/client-testing/src/builders/schemaBuilder.ts#L85)

## Methods

### createData

**createData**(`customSchemas?`, `options?`): `Promise`<`Item`<`Model`<`any`, `any`\>\>[][]\>

Create data for all schemas.

#### Parameters

| Name | Type |
| :------ | :------ |
| `customSchemas?` | [`SchemaDefWithGenerator`](../types/dxos_client_testing.SchemaDefWithGenerator.md)[] |
| `options` | `Object` |

#### Returns

`Promise`<`Item`<`Model`<`any`, `any`\>\>[][]\>

#### Defined in

[packages/sdk/client-testing/src/builders/schemaBuilder.ts:149](https://github.com/dxos/dxos/blob/main/packages/sdk/client-testing/src/builders/schemaBuilder.ts#L149)

___

### createItems

**createItems**(`__namedParameters`, `numItems`): `Promise`<`Item`<`Model`<`any`, `any`\>\>[]\>

Create items for a given schema.
NOTE: Assumes that referenced items have already been constructed.

#### Parameters

| Name | Type |
| :------ | :------ |
| `__namedParameters` | [`SchemaDefWithGenerator`](../types/dxos_client_testing.SchemaDefWithGenerator.md) |
| `numItems` | `number` |

#### Returns

`Promise`<`Item`<`Model`<`any`, `any`\>\>[]\>

#### Defined in

[packages/sdk/client-testing/src/builders/schemaBuilder.ts:117](https://github.com/dxos/dxos/blob/main/packages/sdk/client-testing/src/builders/schemaBuilder.ts#L117)

___

### createSchemas

**createSchemas**(`customSchemas?`): `Promise`<`Schema`[]\>

#### Parameters

| Name | Type |
| :------ | :------ |
| `customSchemas?` | [`SchemaDefWithGenerator`](../types/dxos_client_testing.SchemaDefWithGenerator.md)[] |

#### Returns

`Promise`<`Schema`[]\>

#### Defined in

[packages/sdk/client-testing/src/builders/schemaBuilder.ts:89](https://github.com/dxos/dxos/blob/main/packages/sdk/client-testing/src/builders/schemaBuilder.ts#L89)
