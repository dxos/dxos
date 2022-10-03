# Interface: AccountsClientBackend

[@dxos/registry-client](../modules/dxos_registry_client.md).AccountsClientBackend

## Implemented by

- [`PolkadotAccounts`](../classes/dxos_registry_client.PolkadotAccounts.md)

## Methods

### addDevice

**addDevice**(`account`, `device`): `Promise`<`void`\>

#### Parameters

| Name | Type |
| :------ | :------ |
| `account` | [`AccountKey`](../classes/dxos_registry_client.AccountKey.md) |
| `device` | `string` |

#### Returns

`Promise`<`void`\>

#### Defined in

[packages/sdk/registry-client/src/api/accounts.ts:19](https://github.com/dxos/dxos/blob/main/packages/sdk/registry-client/src/api/accounts.ts#L19)

___

### belongsToAccount

**belongsToAccount**(`account`, `device`): `Promise`<`boolean`\>

#### Parameters

| Name | Type |
| :------ | :------ |
| `account` | [`AccountKey`](../classes/dxos_registry_client.AccountKey.md) |
| `device` | `string` |

#### Returns

`Promise`<`boolean`\>

#### Defined in

[packages/sdk/registry-client/src/api/accounts.ts:20](https://github.com/dxos/dxos/blob/main/packages/sdk/registry-client/src/api/accounts.ts#L20)

___

### createAccount

**createAccount**(): `Promise`<[`AccountKey`](../classes/dxos_registry_client.AccountKey.md)\>

#### Returns

`Promise`<[`AccountKey`](../classes/dxos_registry_client.AccountKey.md)\>

#### Defined in

[packages/sdk/registry-client/src/api/accounts.ts:18](https://github.com/dxos/dxos/blob/main/packages/sdk/registry-client/src/api/accounts.ts#L18)

___

### getAccount

**getAccount**(`account`): `Promise`<`undefined` \| [`Account`](dxos_registry_client.Account.md)\>

#### Parameters

| Name | Type |
| :------ | :------ |
| `account` | [`AccountKey`](../classes/dxos_registry_client.AccountKey.md) |

#### Returns

`Promise`<`undefined` \| [`Account`](dxos_registry_client.Account.md)\>

#### Defined in

[packages/sdk/registry-client/src/api/accounts.ts:16](https://github.com/dxos/dxos/blob/main/packages/sdk/registry-client/src/api/accounts.ts#L16)

___

### listAccounts

**listAccounts**(): `Promise`<[`Account`](dxos_registry_client.Account.md)[]\>

#### Returns

`Promise`<[`Account`](dxos_registry_client.Account.md)[]\>

#### Defined in

[packages/sdk/registry-client/src/api/accounts.ts:17](https://github.com/dxos/dxos/blob/main/packages/sdk/registry-client/src/api/accounts.ts#L17)
