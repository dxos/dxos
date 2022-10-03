# Class: Filter

[@dxos/credentials](../modules/dxos_credentials.md).Filter

Utility to create simple filtering predicates.

## Constructors

### constructor

**new Filter**()

## Methods

### and

`Static` **and**(...`filters`): [`FilterFunction`](../types/dxos_credentials.FilterFunction.md)

ANDs all supplied filters.

#### Parameters

| Name | Type |
| :------ | :------ |
| `...filters` | [`FilterFunction`](../types/dxos_credentials.FilterFunction.md)[] |

#### Returns

[`FilterFunction`](../types/dxos_credentials.FilterFunction.md)

#### Defined in

[packages/halo/credentials/src/keys/filter.ts:32](https://github.com/dxos/dxos/blob/main/packages/halo/credentials/src/keys/filter.ts#L32)

___

### filter

`Static` **filter**(`values`, `filter`): `any`[]

Execute the filter over the supplied values.

#### Parameters

| Name | Type |
| :------ | :------ |
| `values` | `IterableIterator`<`any`\> |
| `filter` | [`FilterFunction`](../types/dxos_credentials.FilterFunction.md) |

#### Returns

`any`[]

#### Defined in

[packages/halo/credentials/src/keys/filter.ts:18](https://github.com/dxos/dxos/blob/main/packages/halo/credentials/src/keys/filter.ts#L18)

___

### hasKey

`Static` **hasKey**(`property`, `key`): [`FilterFunction`](../types/dxos_credentials.FilterFunction.md)

Filters objects for required key.

#### Parameters

| Name | Type |
| :------ | :------ |
| `property` | `string` |
| `key` | `PublicKeyLike` |

#### Returns

[`FilterFunction`](../types/dxos_credentials.FilterFunction.md)

#### Defined in

[packages/halo/credentials/src/keys/filter.ts:53](https://github.com/dxos/dxos/blob/main/packages/halo/credentials/src/keys/filter.ts#L53)

___

### hasProperty

`Static` **hasProperty**(`property`): [`FilterFunction`](../types/dxos_credentials.FilterFunction.md)

Filters objects for required property.

#### Parameters

| Name | Type |
| :------ | :------ |
| `property` | `string` |

#### Returns

[`FilterFunction`](../types/dxos_credentials.FilterFunction.md)

#### Defined in

[packages/halo/credentials/src/keys/filter.ts:39](https://github.com/dxos/dxos/blob/main/packages/halo/credentials/src/keys/filter.ts#L39)

___

### matches

`Static` **matches**(`attributes`): [`FilterFunction`](../types/dxos_credentials.FilterFunction.md)

Filters objects for exact object.
https://lodash.com/docs/#matches

#### Parameters

| Name | Type |
| :------ | :------ |
| `attributes` | `any` |

#### Returns

[`FilterFunction`](../types/dxos_credentials.FilterFunction.md)

#### Defined in

[packages/halo/credentials/src/keys/filter.ts:61](https://github.com/dxos/dxos/blob/main/packages/halo/credentials/src/keys/filter.ts#L61)

___

### not

`Static` **not**(`filter`): [`FilterFunction`](../types/dxos_credentials.FilterFunction.md)

Negates a filter.

#### Parameters

| Name | Type |
| :------ | :------ |
| `filter` | [`FilterFunction`](../types/dxos_credentials.FilterFunction.md) |

#### Returns

[`FilterFunction`](../types/dxos_credentials.FilterFunction.md)

#### Defined in

[packages/halo/credentials/src/keys/filter.ts:25](https://github.com/dxos/dxos/blob/main/packages/halo/credentials/src/keys/filter.ts#L25)

___

### propertyIn

`Static` **propertyIn**(`property`, `values`): [`FilterFunction`](../types/dxos_credentials.FilterFunction.md)

Filters objects for given property values.

#### Parameters

| Name | Type |
| :------ | :------ |
| `property` | `string` |
| `values` | `any`[] |

#### Returns

[`FilterFunction`](../types/dxos_credentials.FilterFunction.md)

#### Defined in

[packages/halo/credentials/src/keys/filter.ts:46](https://github.com/dxos/dxos/blob/main/packages/halo/credentials/src/keys/filter.ts#L46)
