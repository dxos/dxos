# Module: @dxos/client-testing

## Table of contents

### Enumerations

- [TestType](../enums/dxos_client_testing.TestType.md)

### Classes

- [OrgBuilder](../classes/dxos_client_testing.OrgBuilder.md)
- [PartyBuilder](../classes/dxos_client_testing.PartyBuilder.md)
- [ProjectBuilder](../classes/dxos_client_testing.ProjectBuilder.md)
- [SchemaBuilder](../classes/dxos_client_testing.SchemaBuilder.md)
- [TreeRoot](../classes/dxos_client_testing.TreeRoot.md)

### Type Aliases

- [NumberRange](dxos_client_testing.md#numberrange)
- [Options](dxos_client_testing.md#options)
- [SchemaDefWithGenerator](dxos_client_testing.md#schemadefwithgenerator)
- [SchemaFieldWithGenerator](dxos_client_testing.md#schemafieldwithgenerator)
- [TreeNode](dxos_client_testing.md#treenode)

### Variables

- [DefaultSchemaDefs](dxos_client_testing.md#defaultschemadefs)
- [defaultTestOptions](dxos_client_testing.md#defaulttestoptions)

### Functions

- [array](dxos_client_testing.md#array)
- [buildTestParty](dxos_client_testing.md#buildtestparty)
- [capitalize](dxos_client_testing.md#capitalize)
- [enumFromString](dxos_client_testing.md#enumfromstring)
- [getNumber](dxos_client_testing.md#getnumber)
- [log](dxos_client_testing.md#log)
- [times](dxos_client_testing.md#times)
- [treeLogger](dxos_client_testing.md#treelogger)

## Type Aliases

### NumberRange

Ƭ **NumberRange**: [min: number, max: number] \| `number`

#### Defined in

[packages/sdk/client-testing/src/util/util.ts:7](https://github.com/dxos/dxos/blob/32ae9b579/packages/sdk/client-testing/src/util/util.ts#L7)

___

### Options

Ƭ **Options**: `Object`

#### Type declaration

| Name | Type |
| :------ | :------ |
| `numOrgs?` | [`NumberRange`](dxos_client_testing.md#numberrange) |
| `numPeople?` | [`NumberRange`](dxos_client_testing.md#numberrange) |
| `numProjects?` | [`NumberRange`](dxos_client_testing.md#numberrange) |
| `numTasks?` | [`NumberRange`](dxos_client_testing.md#numberrange) |

#### Defined in

[packages/sdk/client-testing/src/builders/partyBuilder.ts:222](https://github.com/dxos/dxos/blob/32ae9b579/packages/sdk/client-testing/src/builders/partyBuilder.ts#L222)

___

### SchemaDefWithGenerator

Ƭ **SchemaDefWithGenerator**: `Omit`<`SchemaDef`, ``"fields"``\> & { `fields`: [`SchemaFieldWithGenerator`](dxos_client_testing.md#schemafieldwithgenerator)[]  }

#### Defined in

[packages/sdk/client-testing/src/builders/schemaBuilder.ts:18](https://github.com/dxos/dxos/blob/32ae9b579/packages/sdk/client-testing/src/builders/schemaBuilder.ts#L18)

___

### SchemaFieldWithGenerator

Ƭ **SchemaFieldWithGenerator**: `SchemaField` & { `generator?`: () => `string` \| `number` \| `boolean` \| `SchemaRef`  }

#### Defined in

[packages/sdk/client-testing/src/builders/schemaBuilder.ts:17](https://github.com/dxos/dxos/blob/32ae9b579/packages/sdk/client-testing/src/builders/schemaBuilder.ts#L17)

___

### TreeNode

Ƭ **TreeNode**: [`TreeRoot`](../classes/dxos_client_testing.TreeRoot.md) \| `Item`

#### Defined in

[packages/sdk/client-testing/src/logging/tree.ts:20](https://github.com/dxos/dxos/blob/32ae9b579/packages/sdk/client-testing/src/logging/tree.ts#L20)

## Variables

### DefaultSchemaDefs

• `Const` **DefaultSchemaDefs**: `Object`

#### Index signature

▪ [schema: `string`]: [`SchemaDefWithGenerator`](dxos_client_testing.md#schemadefwithgenerator)

#### Defined in

[packages/sdk/client-testing/src/builders/schemaBuilder.ts:21](https://github.com/dxos/dxos/blob/32ae9b579/packages/sdk/client-testing/src/builders/schemaBuilder.ts#L21)

___

### defaultTestOptions

• `Const` **defaultTestOptions**: [`Options`](dxos_client_testing.md#options)

#### Defined in

[packages/sdk/client-testing/src/builders/partyBuilder.ts:229](https://github.com/dxos/dxos/blob/32ae9b579/packages/sdk/client-testing/src/builders/partyBuilder.ts#L229)

## Functions

### array

▸ **array**(`length`): `unknown`[]

#### Parameters

| Name | Type |
| :------ | :------ |
| `length` | `number` |

#### Returns

`unknown`[]

#### Defined in

[packages/sdk/client-testing/src/util/util.ts:11](https://github.com/dxos/dxos/blob/32ae9b579/packages/sdk/client-testing/src/util/util.ts#L11)

___

### buildTestParty

▸ **buildTestParty**(`builder`, `options?`): `Promise`<`void`\>

Create populated test party.

#### Parameters

| Name | Type | Default value |
| :------ | :------ | :------ |
| `builder` | [`PartyBuilder`](../classes/dxos_client_testing.PartyBuilder.md) | `undefined` |
| `options` | [`Options`](dxos_client_testing.md#options) | `defaultTestOptions` |

#### Returns

`Promise`<`void`\>

#### Defined in

[packages/sdk/client-testing/src/builders/partyBuilder.ts:241](https://github.com/dxos/dxos/blob/32ae9b579/packages/sdk/client-testing/src/builders/partyBuilder.ts#L241)

___

### capitalize

▸ **capitalize**(`text`): `string`

#### Parameters

| Name | Type |
| :------ | :------ |
| `text` | `string` |

#### Returns

`string`

#### Defined in

[packages/sdk/client-testing/src/util/util.ts:17](https://github.com/dxos/dxos/blob/32ae9b579/packages/sdk/client-testing/src/util/util.ts#L17)

___

### enumFromString

▸ **enumFromString**<`T`\>(`type`, `value`): `undefined` \| `T`

#### Type parameters

| Name |
| :------ |
| `T` |

#### Parameters

| Name | Type |
| :------ | :------ |
| `type` | `Object` |
| `value` | `string` |

#### Returns

`undefined` \| `T`

#### Defined in

[packages/sdk/client-testing/src/util/util.ts:15](https://github.com/dxos/dxos/blob/32ae9b579/packages/sdk/client-testing/src/util/util.ts#L15)

___

### getNumber

▸ **getNumber**(`n`): `number`

#### Parameters

| Name | Type |
| :------ | :------ |
| `n` | [`NumberRange`](dxos_client_testing.md#numberrange) |

#### Returns

`number`

#### Defined in

[packages/sdk/client-testing/src/util/util.ts:9](https://github.com/dxos/dxos/blob/32ae9b579/packages/sdk/client-testing/src/util/util.ts#L9)

___

### log

▸ **log**(`formatter`, ...`args`): `void`

#### Parameters

| Name | Type |
| :------ | :------ |
| `formatter` | `any` |
| `...args` | `any`[] |

#### Returns

`void`

#### Defined in

node_modules/.pnpm/@types+debug@4.1.7/node_modules/@types/debug/index.d.ts:44

___

### times

▸ **times**<`T`\>(`length`, `constructor`): `T`[]

#### Type parameters

| Name |
| :------ |
| `T` |

#### Parameters

| Name | Type |
| :------ | :------ |
| `length` | `number` |
| `constructor` | (`i`: `number`) => `T` |

#### Returns

`T`[]

#### Defined in

[packages/sdk/client-testing/src/util/util.ts:13](https://github.com/dxos/dxos/blob/32ae9b579/packages/sdk/client-testing/src/util/util.ts#L13)

___

### treeLogger

▸ **treeLogger**(`node`, `ancestors?`, `rows?`): `string`

Create tree using depth first traversal.
https://waylonwalker.com/drawing-ascii-boxes/#connectors

#### Parameters

| Name | Type | Default value |
| :------ | :------ | :------ |
| `node` | [`TreeNode`](dxos_client_testing.md#treenode) | `undefined` |
| `ancestors` | [[`TreeNode`](dxos_client_testing.md#treenode), `number`][] | `[]` |
| `rows` | `string`[] | `[]` |

#### Returns

`string`

#### Defined in

[packages/sdk/client-testing/src/logging/tree.ts:26](https://github.com/dxos/dxos/blob/32ae9b579/packages/sdk/client-testing/src/logging/tree.ts#L26)
