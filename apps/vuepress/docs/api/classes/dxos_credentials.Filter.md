# Class: Filter

[@dxos/credentials](../modules/dxos_credentials.md).Filter

Utility to create simple filtering predicates.

## Table of contents

### Constructors

- [constructor](dxos_credentials.Filter.md#constructor)

### Methods

- [and](dxos_credentials.Filter.md#and)
- [filter](dxos_credentials.Filter.md#filter)
- [hasKey](dxos_credentials.Filter.md#haskey)
- [hasProperty](dxos_credentials.Filter.md#hasproperty)
- [matches](dxos_credentials.Filter.md#matches)
- [not](dxos_credentials.Filter.md#not)
- [propertyIn](dxos_credentials.Filter.md#propertyin)

## Constructors

### constructor

• **new Filter**()

## Methods

### and

▸ `Static` **and**(...`filters`): [`FilterFunction`](../modules/dxos_credentials.md#filterfunction)

ANDs all supplied filters.

#### Parameters

| Name | Type |
| :------ | :------ |
| `...filters` | [`FilterFunction`](../modules/dxos_credentials.md#filterfunction)[] |

#### Returns

[`FilterFunction`](../modules/dxos_credentials.md#filterfunction)

#### Defined in

[packages/halo/credentials/src/keys/filter.ts:32](https://github.com/dxos/dxos/blob/e3b936721/packages/halo/credentials/src/keys/filter.ts#L32)

___

### filter

▸ `Static` **filter**(`values`, `filter`): `any`[]

Execute the filter over the supplied values.

#### Parameters

| Name | Type |
| :------ | :------ |
| `values` | `IterableIterator`<`any`\> |
| `filter` | [`FilterFunction`](../modules/dxos_credentials.md#filterfunction) |

#### Returns

`any`[]

#### Defined in

[packages/halo/credentials/src/keys/filter.ts:18](https://github.com/dxos/dxos/blob/e3b936721/packages/halo/credentials/src/keys/filter.ts#L18)

___

### hasKey

▸ `Static` **hasKey**(`property`, `key`): [`FilterFunction`](../modules/dxos_credentials.md#filterfunction)

Filters objects for required key.

#### Parameters

| Name | Type |
| :------ | :------ |
| `property` | `string` |
| `key` | `PublicKeyLike` |

#### Returns

[`FilterFunction`](../modules/dxos_credentials.md#filterfunction)

#### Defined in

[packages/halo/credentials/src/keys/filter.ts:53](https://github.com/dxos/dxos/blob/e3b936721/packages/halo/credentials/src/keys/filter.ts#L53)

___

### hasProperty

▸ `Static` **hasProperty**(`property`): [`FilterFunction`](../modules/dxos_credentials.md#filterfunction)

Filters objects for required property.

#### Parameters

| Name | Type |
| :------ | :------ |
| `property` | `string` |

#### Returns

[`FilterFunction`](../modules/dxos_credentials.md#filterfunction)

#### Defined in

[packages/halo/credentials/src/keys/filter.ts:39](https://github.com/dxos/dxos/blob/e3b936721/packages/halo/credentials/src/keys/filter.ts#L39)

___

### matches

▸ `Static` **matches**(`attributes`): [`FilterFunction`](../modules/dxos_credentials.md#filterfunction)

Filters objects for exact object.
https://lodash.com/docs/#matches

#### Parameters

| Name | Type |
| :------ | :------ |
| `attributes` | `any` |

#### Returns

[`FilterFunction`](../modules/dxos_credentials.md#filterfunction)

#### Defined in

[packages/halo/credentials/src/keys/filter.ts:61](https://github.com/dxos/dxos/blob/e3b936721/packages/halo/credentials/src/keys/filter.ts#L61)

___

### not

▸ `Static` **not**(`filter`): [`FilterFunction`](../modules/dxos_credentials.md#filterfunction)

Negates a filter.

#### Parameters

| Name | Type |
| :------ | :------ |
| `filter` | [`FilterFunction`](../modules/dxos_credentials.md#filterfunction) |

#### Returns

[`FilterFunction`](../modules/dxos_credentials.md#filterfunction)

#### Defined in

[packages/halo/credentials/src/keys/filter.ts:25](https://github.com/dxos/dxos/blob/e3b936721/packages/halo/credentials/src/keys/filter.ts#L25)

___

### propertyIn

▸ `Static` **propertyIn**(`property`, `values`): [`FilterFunction`](../modules/dxos_credentials.md#filterfunction)

Filters objects for given property values.

#### Parameters

| Name | Type |
| :------ | :------ |
| `property` | `string` |
| `values` | `any`[] |

#### Returns

[`FilterFunction`](../modules/dxos_credentials.md#filterfunction)

#### Defined in

[packages/halo/credentials/src/keys/filter.ts:46](https://github.com/dxos/dxos/blob/e3b936721/packages/halo/credentials/src/keys/filter.ts#L46)
