# Class: AccountKey

[@dxos/registry-client](../modules/dxos_registry_client.md).AccountKey

Represents an account key.

Account keys must conform to regex: /^[a-z0-9_]+$/.

## Table of contents

### Constructors

- [constructor](dxos_registry_client.AccountKey.md#constructor)

### Properties

- [value](dxos_registry_client.AccountKey.md#value)

### Methods

- [equals](dxos_registry_client.AccountKey.md#equals)
- [toHex](dxos_registry_client.AccountKey.md#tohex)
- [toString](dxos_registry_client.AccountKey.md#tostring)
- [equals](dxos_registry_client.AccountKey.md#equals-1)
- [fromHex](dxos_registry_client.AccountKey.md#fromhex)
- [random](dxos_registry_client.AccountKey.md#random)

## Constructors

### constructor

• **new AccountKey**(`value`)

#### Parameters

| Name | Type |
| :------ | :------ |
| `value` | `Uint8Array` |

#### Defined in

[packages/sdk/registry-client/src/api/account-key.ts:30](https://github.com/dxos/dxos/blob/32ae9b579/packages/sdk/registry-client/src/api/account-key.ts#L30)

## Properties

### value

• `Readonly` **value**: `Uint8Array`

#### Defined in

[packages/sdk/registry-client/src/api/account-key.ts:31](https://github.com/dxos/dxos/blob/32ae9b579/packages/sdk/registry-client/src/api/account-key.ts#L31)

## Methods

### equals

▸ **equals**(`other`): `boolean`

#### Parameters

| Name | Type |
| :------ | :------ |
| `other` | `string` \| [`AccountKey`](dxos_registry_client.AccountKey.md) |

#### Returns

`boolean`

#### Defined in

[packages/sdk/registry-client/src/api/account-key.ts:44](https://github.com/dxos/dxos/blob/32ae9b579/packages/sdk/registry-client/src/api/account-key.ts#L44)

___

### toHex

▸ **toHex**(): `string`

#### Returns

`string`

#### Defined in

[packages/sdk/registry-client/src/api/account-key.ts:36](https://github.com/dxos/dxos/blob/32ae9b579/packages/sdk/registry-client/src/api/account-key.ts#L36)

___

### toString

▸ **toString**(): `string`

#### Returns

`string`

#### Defined in

[packages/sdk/registry-client/src/api/account-key.ts:40](https://github.com/dxos/dxos/blob/32ae9b579/packages/sdk/registry-client/src/api/account-key.ts#L40)

___

### equals

▸ `Static` **equals**(`left`, `right`): `boolean`

#### Parameters

| Name | Type |
| :------ | :------ |
| `left` | `string` \| [`AccountKey`](dxos_registry_client.AccountKey.md) |
| `right` | `string` \| [`AccountKey`](dxos_registry_client.AccountKey.md) |

#### Returns

`boolean`

#### Defined in

[packages/sdk/registry-client/src/api/account-key.ts:24](https://github.com/dxos/dxos/blob/32ae9b579/packages/sdk/registry-client/src/api/account-key.ts#L24)

___

### fromHex

▸ `Static` **fromHex**(`hexString`): [`AccountKey`](dxos_registry_client.AccountKey.md)

#### Parameters

| Name | Type |
| :------ | :------ |
| `hexString` | `string` |

#### Returns

[`AccountKey`](dxos_registry_client.AccountKey.md)

#### Defined in

[packages/sdk/registry-client/src/api/account-key.ts:16](https://github.com/dxos/dxos/blob/32ae9b579/packages/sdk/registry-client/src/api/account-key.ts#L16)

___

### random

▸ `Static` **random**(): [`AccountKey`](dxos_registry_client.AccountKey.md)

#### Returns

[`AccountKey`](dxos_registry_client.AccountKey.md)

#### Defined in

[packages/sdk/registry-client/src/api/account-key.ts:20](https://github.com/dxos/dxos/blob/32ae9b579/packages/sdk/registry-client/src/api/account-key.ts#L20)
