# Class: Generator

[@dxos/echo-testing](../modules/dxos_echo_testing.md).Generator

Data generator.

## Constructors

### constructor

**new Generator**(`_database`, `_options?`)

#### Parameters

| Name | Type |
| :------ | :------ |
| `_database` | `Database` |
| `_options?` | `GeneratorOptions` |

#### Defined in

[packages/echo/echo-testing/src/generator.ts:69](https://github.com/dxos/dxos/blob/main/packages/echo/echo-testing/src/generator.ts#L69)

## Accessors

### database

`get` **database**(): `Database`

#### Returns

`Database`

#### Defined in

[packages/echo/echo-testing/src/generator.ts:80](https://github.com/dxos/dxos/blob/main/packages/echo/echo-testing/src/generator.ts#L80)

___

### labels

`get` **labels**(): `string`[]

#### Returns

`string`[]

#### Defined in

[packages/echo/echo-testing/src/generator.ts:84](https://github.com/dxos/dxos/blob/main/packages/echo/echo-testing/src/generator.ts#L84)

## Methods

### createItem

**createItem**(`sourceId`): `Promise`<`void`\>

#### Parameters

| Name | Type |
| :------ | :------ |
| `sourceId` | `string` |

#### Returns

`Promise`<`void`\>

#### Defined in

[packages/echo/echo-testing/src/generator.ts:89](https://github.com/dxos/dxos/blob/main/packages/echo/echo-testing/src/generator.ts#L89)

___

### generate

**generate**(`config`): `Promise`<`void`\>

#### Parameters

| Name | Type |
| :------ | :------ |
| `config` | `GenerateConfig` |

#### Returns

`Promise`<`void`\>

#### Defined in

[packages/echo/echo-testing/src/generator.ts:107](https://github.com/dxos/dxos/blob/main/packages/echo/echo-testing/src/generator.ts#L107)

___

### linkItem

**linkItem**(`sourceId`, `targetId`): `Promise`<`void`\>

#### Parameters

| Name | Type |
| :------ | :------ |
| `sourceId` | `string` |
| `targetId` | `string` |

#### Returns

`Promise`<`void`\>

#### Defined in

[packages/echo/echo-testing/src/generator.ts:99](https://github.com/dxos/dxos/blob/main/packages/echo/echo-testing/src/generator.ts#L99)
