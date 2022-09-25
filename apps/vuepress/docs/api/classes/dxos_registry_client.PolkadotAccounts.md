# Class: PolkadotAccounts

[@dxos/registry-client](../modules/dxos_registry_client.md).PolkadotAccounts

Polkadot DXNS accounts client backend.

## Hierarchy

- [`PolkadotClient`](dxos_registry_client.PolkadotClient.md)

  ↳ **`PolkadotAccounts`**

## Implements

- [`AccountsClientBackend`](../interfaces/dxos_registry_client.AccountsClientBackend.md)

## Constructors

### constructor

**new PolkadotAccounts**(`api`, `signFn?`)

#### Parameters

| Name | Type |
| :------ | :------ |
| `api` | `ApiPromise` |
| `signFn` | [`SignTxFunction`](../types/dxos_registry_client.SignTxFunction.md) \| `AddressOrPair` |

#### Inherited from

[PolkadotClient](dxos_registry_client.PolkadotClient.md).[constructor](dxos_registry_client.PolkadotClient.md#constructor)

#### Defined in

[packages/sdk/registry-client/src/polkadot/polkadot-client.ts:16](https://github.com/dxos/dxos/blob/db8188dae/packages/sdk/registry-client/src/polkadot/polkadot-client.ts#L16)

## Properties

### api

 `Protected` **api**: `ApiPromise`

#### Inherited from

[PolkadotClient](dxos_registry_client.PolkadotClient.md).[api](dxos_registry_client.PolkadotClient.md#api)

#### Defined in

[packages/sdk/registry-client/src/polkadot/polkadot-client.ts:17](https://github.com/dxos/dxos/blob/db8188dae/packages/sdk/registry-client/src/polkadot/polkadot-client.ts#L17)

___

### transactionsHandler

 `Protected` **transactionsHandler**: [`ApiTransactionHandler`](dxos_registry_client.ApiTransactionHandler.md)

#### Inherited from

[PolkadotClient](dxos_registry_client.PolkadotClient.md).[transactionsHandler](dxos_registry_client.PolkadotClient.md#transactionshandler)

#### Defined in

[packages/sdk/registry-client/src/polkadot/polkadot-client.ts:14](https://github.com/dxos/dxos/blob/db8188dae/packages/sdk/registry-client/src/polkadot/polkadot-client.ts#L14)

## Methods

### addDevice

**addDevice**(`account`, `device`): `Promise`<`void`\>

#### Parameters

| Name | Type |
| :------ | :------ |
| `account` | [`AccountKey`](dxos_registry_client.AccountKey.md) |
| `device` | `string` |

#### Returns

`Promise`<`void`\>

#### Implementation of

[AccountsClientBackend](../interfaces/dxos_registry_client.AccountsClientBackend.md).[addDevice](../interfaces/dxos_registry_client.AccountsClientBackend.md#adddevice)

#### Defined in

[packages/sdk/registry-client/src/polkadot/accounts.ts:48](https://github.com/dxos/dxos/blob/db8188dae/packages/sdk/registry-client/src/polkadot/accounts.ts#L48)

___

### belongsToAccount

**belongsToAccount**(`account`, `device`): `Promise`<`boolean`\>

#### Parameters

| Name | Type |
| :------ | :------ |
| `account` | [`AccountKey`](dxos_registry_client.AccountKey.md) |
| `device` | `string` |

#### Returns

`Promise`<`boolean`\>

#### Implementation of

[AccountsClientBackend](../interfaces/dxos_registry_client.AccountsClientBackend.md).[belongsToAccount](../interfaces/dxos_registry_client.AccountsClientBackend.md#belongstoaccount)

#### Defined in

[packages/sdk/registry-client/src/polkadot/accounts.ts:53](https://github.com/dxos/dxos/blob/db8188dae/packages/sdk/registry-client/src/polkadot/accounts.ts#L53)

___

### createAccount

**createAccount**(): `Promise`<[`AccountKey`](dxos_registry_client.AccountKey.md)\>

#### Returns

`Promise`<[`AccountKey`](dxos_registry_client.AccountKey.md)\>

#### Implementation of

[AccountsClientBackend](../interfaces/dxos_registry_client.AccountsClientBackend.md).[createAccount](../interfaces/dxos_registry_client.AccountsClientBackend.md#createaccount)

#### Defined in

[packages/sdk/registry-client/src/polkadot/accounts.ts:38](https://github.com/dxos/dxos/blob/db8188dae/packages/sdk/registry-client/src/polkadot/accounts.ts#L38)

___

### getAccount

**getAccount**(`account`): `Promise`<`undefined` \| [`Account`](../interfaces/dxos_registry_client.Account.md)\>

#### Parameters

| Name | Type |
| :------ | :------ |
| `account` | [`AccountKey`](dxos_registry_client.AccountKey.md) |

#### Returns

`Promise`<`undefined` \| [`Account`](../interfaces/dxos_registry_client.Account.md)\>

#### Implementation of

[AccountsClientBackend](../interfaces/dxos_registry_client.AccountsClientBackend.md).[getAccount](../interfaces/dxos_registry_client.AccountsClientBackend.md#getaccount)

#### Defined in

[packages/sdk/registry-client/src/polkadot/accounts.ts:14](https://github.com/dxos/dxos/blob/db8188dae/packages/sdk/registry-client/src/polkadot/accounts.ts#L14)

___

### listAccounts

**listAccounts**(): `Promise`<[`Account`](../interfaces/dxos_registry_client.Account.md)[]\>

#### Returns

`Promise`<[`Account`](../interfaces/dxos_registry_client.Account.md)[]\>

#### Implementation of

[AccountsClientBackend](../interfaces/dxos_registry_client.AccountsClientBackend.md).[listAccounts](../interfaces/dxos_registry_client.AccountsClientBackend.md#listaccounts)

#### Defined in

[packages/sdk/registry-client/src/polkadot/accounts.ts:26](https://github.com/dxos/dxos/blob/db8188dae/packages/sdk/registry-client/src/polkadot/accounts.ts#L26)
