# Interface: AccountsClientBackend

[@dxos/registry-client](../modules/dxos_registry_client.md).AccountsClientBackend

## Implemented by

- [`PolkadotAccounts`](../classes/dxos_registry_client.PolkadotAccounts.md)

## Table of contents

### Methods

- [addDevice](dxos_registry_client.AccountsClientBackend.md#adddevice)
- [belongsToAccount](dxos_registry_client.AccountsClientBackend.md#belongstoaccount)
- [createAccount](dxos_registry_client.AccountsClientBackend.md#createaccount)
- [getAccount](dxos_registry_client.AccountsClientBackend.md#getaccount)
- [listAccounts](dxos_registry_client.AccountsClientBackend.md#listaccounts)

## Methods

### addDevice

▸ **addDevice**(`account`, `device`): `Promise`<`void`\>

#### Parameters

| Name | Type |
| :------ | :------ |
| `account` | [`AccountKey`](../classes/dxos_registry_client.AccountKey.md) |
| `device` | `string` |

#### Returns

`Promise`<`void`\>

#### Defined in

[packages/sdk/registry-client/src/api/accounts.ts:19](https://github.com/dxos/dxos/blob/e3b936721/packages/sdk/registry-client/src/api/accounts.ts#L19)

___

### belongsToAccount

▸ **belongsToAccount**(`account`, `device`): `Promise`<`boolean`\>

#### Parameters

| Name | Type |
| :------ | :------ |
| `account` | [`AccountKey`](../classes/dxos_registry_client.AccountKey.md) |
| `device` | `string` |

#### Returns

`Promise`<`boolean`\>

#### Defined in

[packages/sdk/registry-client/src/api/accounts.ts:20](https://github.com/dxos/dxos/blob/e3b936721/packages/sdk/registry-client/src/api/accounts.ts#L20)

___

### createAccount

▸ **createAccount**(): `Promise`<[`AccountKey`](../classes/dxos_registry_client.AccountKey.md)\>

#### Returns

`Promise`<[`AccountKey`](../classes/dxos_registry_client.AccountKey.md)\>

#### Defined in

[packages/sdk/registry-client/src/api/accounts.ts:18](https://github.com/dxos/dxos/blob/e3b936721/packages/sdk/registry-client/src/api/accounts.ts#L18)

___

### getAccount

▸ **getAccount**(`account`): `Promise`<`undefined` \| [`Account`](dxos_registry_client.Account.md)\>

#### Parameters

| Name | Type |
| :------ | :------ |
| `account` | [`AccountKey`](../classes/dxos_registry_client.AccountKey.md) |

#### Returns

`Promise`<`undefined` \| [`Account`](dxos_registry_client.Account.md)\>

#### Defined in

[packages/sdk/registry-client/src/api/accounts.ts:16](https://github.com/dxos/dxos/blob/e3b936721/packages/sdk/registry-client/src/api/accounts.ts#L16)

___

### listAccounts

▸ **listAccounts**(): `Promise`<[`Account`](dxos_registry_client.Account.md)[]\>

#### Returns

`Promise`<[`Account`](dxos_registry_client.Account.md)[]\>

#### Defined in

[packages/sdk/registry-client/src/api/accounts.ts:17](https://github.com/dxos/dxos/blob/e3b936721/packages/sdk/registry-client/src/api/accounts.ts#L17)
