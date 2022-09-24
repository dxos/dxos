# Module: @dxos/config

## Table of contents

### References

- [ConfigProto](dxos_config.md#configproto)

### Namespaces

- [defs](dxos_config.defs.md)

### Classes

- [Config](../classes/dxos_config.Config.md)

### Type Aliases

- [ConfigKey](dxos_config.md#configkey)
- [ConfigProvider](dxos_config.md#configprovider)
- [DeepIndex](dxos_config.md#deepindex)
- [ParseKey](dxos_config.md#parsekey)

### Variables

- [FILE\_DEFAULTS](dxos_config.md#file_defaults)
- [FILE\_DYNAMICS](dxos_config.md#file_dynamics)
- [FILE\_ENVS](dxos_config.md#file_envs)

### Functions

- [Defaults](dxos_config.md#defaults)
- [Dynamics](dxos_config.md#dynamics)
- [Envs](dxos_config.md#envs)
- [LocalStorage](dxos_config.md#localstorage)
- [mapFromKeyValues](dxos_config.md#mapfromkeyvalues)
- [mapToKeyValues](dxos_config.md#maptokeyvalues)

## References

### ConfigProto

Renames and re-exports [Config](../interfaces/dxos_config.defs.Config.md)

## Type Aliases

### ConfigKey

Ƭ **ConfigKey**: `DotNestedKeys`<[`Config`](../interfaces/dxos_config.defs.Config.md)\>

Any nested dot separated key that can be in config.

#### Defined in

[packages/sdk/config/src/types.ts:56](https://github.com/dxos/dxos/blob/e3b936721/packages/sdk/config/src/types.ts#L56)

___

### ConfigProvider

Ƭ **ConfigProvider**: `MaybeFunction`<`MaybePromise`<[`Config`](../classes/dxos_config.Config.md) \| [`Config`](../interfaces/dxos_config.defs.Config.md)\>\>

#### Defined in

[packages/sdk/config/src/types.ts:10](https://github.com/dxos/dxos/blob/e3b936721/packages/sdk/config/src/types.ts#L10)

___

### DeepIndex

Ƭ **DeepIndex**<`T`, `KS`, `Fail`\>: `KS` extends [infer F, ...(infer R)] ? `F` extends keyof `Exclude`<`T`, `undefined`\> ? `R` extends `Keys` ? [`DeepIndex`](dxos_config.md#deepindex)<`Exclude`<`T`, `undefined`\>[`F`], `R`, `Fail`\> : `Fail` : `Fail` : `T`

Retrieves a property type in a series of nested objects.

Read more: https://stackoverflow.com/a/61648690.

#### Type parameters

| Name | Type |
| :------ | :------ |
| `T` | `T` |
| `KS` | extends `Keys` |
| `Fail` | `undefined` |

#### Defined in

[packages/sdk/config/src/types.ts:48](https://github.com/dxos/dxos/blob/e3b936721/packages/sdk/config/src/types.ts#L48)

___

### ParseKey

Ƭ **ParseKey**<`K`\>: `K` extends \`${infer L}.${infer Rest}\` ? [`L`, ...ParseKey<Rest\>] : [`K`]

Parse a dot separated nested key into an array of keys.

Example: 'services.signal.server' -> ['services', 'signal', 'server'].

#### Type parameters

| Name | Type |
| :------ | :------ |
| `K` | extends `string` |

#### Defined in

[packages/sdk/config/src/types.ts:36](https://github.com/dxos/dxos/blob/e3b936721/packages/sdk/config/src/types.ts#L36)

## Variables

### FILE\_DEFAULTS

• `Const` **FILE\_DEFAULTS**: ``"defaults.yml"``

#### Defined in

[packages/sdk/config/src/types.ts:12](https://github.com/dxos/dxos/blob/e3b936721/packages/sdk/config/src/types.ts#L12)

___

### FILE\_DYNAMICS

• `Const` **FILE\_DYNAMICS**: ``"config.yml"``

#### Defined in

[packages/sdk/config/src/types.ts:14](https://github.com/dxos/dxos/blob/e3b936721/packages/sdk/config/src/types.ts#L14)

___

### FILE\_ENVS

• `Const` **FILE\_ENVS**: ``"envs-map.yml"``

#### Defined in

[packages/sdk/config/src/types.ts:13](https://github.com/dxos/dxos/blob/e3b936721/packages/sdk/config/src/types.ts#L13)

## Functions

### Defaults

▸ **Defaults**<`T`\>(`basePath?`): `T`

JSON config.

#### Type parameters

| Name | Type |
| :------ | :------ |
| `T` | [`Config`](../interfaces/dxos_config.defs.Config.md) |

#### Parameters

| Name | Type | Default value |
| :------ | :------ | :------ |
| `basePath` | `string` | `DEFAULT_BASE_PATH` |

#### Returns

`T`

#### Defined in

[packages/sdk/config/src/loaders/index.ts:49](https://github.com/dxos/dxos/blob/e3b936721/packages/sdk/config/src/loaders/index.ts#L49)

___

### Dynamics

▸ **Dynamics**<`T`\>(): `T`

Provided dynamically by server.

#### Type parameters

| Name | Type |
| :------ | :------ |
| `T` | [`Config`](../interfaces/dxos_config.defs.Config.md) |

#### Returns

`T`

#### Defined in

[packages/sdk/config/src/loaders/index.ts:36](https://github.com/dxos/dxos/blob/e3b936721/packages/sdk/config/src/loaders/index.ts#L36)

___

### Envs

▸ **Envs**<`T`\>(`basePath?`): `T`

ENV variable (key/value) map

#### Type parameters

| Name | Type |
| :------ | :------ |
| `T` | [`Config`](../interfaces/dxos_config.defs.Config.md) |

#### Parameters

| Name | Type | Default value |
| :------ | :------ | :------ |
| `basePath` | `string` | `DEFAULT_BASE_PATH` |

#### Returns

`T`

#### Defined in

[packages/sdk/config/src/loaders/index.ts:41](https://github.com/dxos/dxos/blob/e3b936721/packages/sdk/config/src/loaders/index.ts#L41)

___

### LocalStorage

▸ **LocalStorage**<`T`\>(): `T`

File storage.

#### Type parameters

| Name | Type |
| :------ | :------ |
| `T` | [`Config`](../interfaces/dxos_config.defs.Config.md) |

#### Returns

`T`

#### Defined in

[packages/sdk/config/src/loaders/index.ts:31](https://github.com/dxos/dxos/blob/e3b936721/packages/sdk/config/src/loaders/index.ts#L31)

___

### mapFromKeyValues

▸ **mapFromKeyValues**(`spec`, `values`): `Object`

Maps the given objects onto a flattened set of (key x values).

#### Parameters

| Name | Type |
| :------ | :------ |
| `spec` | `MappingSpec` |
| `values` | `Record`<`string`, `any`\> |

#### Returns

`Object`

#### Defined in

[packages/sdk/config/src/config.ts:23](https://github.com/dxos/dxos/blob/e3b936721/packages/sdk/config/src/config.ts#L23)

___

### mapToKeyValues

▸ **mapToKeyValues**(`spec`, `values`): `Record`<`string`, `any`\>

Maps the given flattend set of (key x values) onto a JSON object.

#### Parameters

| Name | Type |
| :------ | :------ |
| `spec` | `MappingSpec` |
| `values` | `any` |

#### Returns

`Record`<`string`, `any`\>

#### Defined in

[packages/sdk/config/src/config.ts:69](https://github.com/dxos/dxos/blob/e3b936721/packages/sdk/config/src/config.ts#L69)
