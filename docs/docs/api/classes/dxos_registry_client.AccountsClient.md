# Class: AccountsClient

[@dxos/registry-client](../modules/dxos_registry_client.md).AccountsClient

Main API for DXNS account and devices management.

## Constructors

### constructor

**new AccountsClient**(`_backend`)

#### Parameters

| Name | Type |
| :------ | :------ |
| `_backend` | [`AccountsClientBackend`](../interfaces/dxos_registry_client.AccountsClientBackend.md) |

#### Defined in

[packages/sdk/registry-client/src/api/accounts-client.ts:12](https://github.com/dxos/dxos/blob/main/packages/sdk/registry-client/src/api/accounts-client.ts#L12)

## Methods

### addDevice

**addDevice**(`account`, `device`): `Promise`<`void`\>

Add a new device to an existing DXNS account.

#### Parameters

| Name | Type |
| :------ | :------ |
| `account` | [`AccountKey`](dxos_registry_client.AccountKey.md) |
| `device` | `string` |

#### Returns

`Promise`<`void`\>

#### Defined in

[packages/sdk/registry-client/src/api/accounts-client.ts:40](https://github.com/dxos/dxos/blob/main/packages/sdk/registry-client/src/api/accounts-client.ts#L40)

___

### belongsToAccount

**belongsToAccount**(`account`, `device`): `Promise`<`boolean`\>

Is the given device a listed device of this DXNS account?

#### Parameters

| Name | Type |
| :------ | :------ |
| `account` | [`AccountKey`](dxos_registry_client.AccountKey.md) |
| `device` | `string` |

#### Returns

`Promise`<`boolean`\>

#### Defined in

[packages/sdk/registry-client/src/api/accounts-client.ts:47](https://github.com/dxos/dxos/blob/main/packages/sdk/registry-client/src/api/accounts-client.ts#L47)

___

### createAccount

**createAccount**(): `Promise`<[`AccountKey`](dxos_registry_client.AccountKey.md)\>

Creates a DXNS account on the blockchain.

#### Returns

`Promise`<[`AccountKey`](dxos_registry_client.AccountKey.md)\>

#### Defined in

[packages/sdk/registry-client/src/api/accounts-client.ts:33](https://github.com/dxos/dxos/blob/main/packages/sdk/registry-client/src/api/accounts-client.ts#L33)

___

### getAccount

**getAccount**(`account`): `Promise`<`undefined` \| [`Account`](../interfaces/dxos_registry_client.Account.md)\>

Get the account details.

#### Parameters

| Name | Type |
| :------ | :------ |
| `account` | [`AccountKey`](dxos_registry_client.AccountKey.md) |

#### Returns

`Promise`<`undefined` \| [`Account`](../interfaces/dxos_registry_client.Account.md)\>

#### Defined in

[packages/sdk/registry-client/src/api/accounts-client.ts:19](https://github.com/dxos/dxos/blob/main/packages/sdk/registry-client/src/api/accounts-client.ts#L19)

___

### listAccounts

**listAccounts**(): `Promise`<[`Account`](../interfaces/dxos_registry_client.Account.md)[]\>

List accounts in the system.

#### Returns

`Promise`<[`Account`](../interfaces/dxos_registry_client.Account.md)[]\>

#### Defined in

[packages/sdk/registry-client/src/api/accounts-client.ts:26](https://github.com/dxos/dxos/blob/main/packages/sdk/registry-client/src/api/accounts-client.ts#L26)
