# Class: PolkadotClient

[@dxos/registry-client](../modules/dxos_registry_client.md).PolkadotClient

Base functionality for derived clients.

## Hierarchy

- **`PolkadotClient`**

  ↳ [`PolkadotAccounts`](dxos_registry_client.PolkadotAccounts.md)

  ↳ [`PolkadotAuctions`](dxos_registry_client.PolkadotAuctions.md)

  ↳ [`PolkadotRegistry`](dxos_registry_client.PolkadotRegistry.md)

## Table of contents

### Constructors

- [constructor](dxos_registry_client.PolkadotClient.md#constructor)

### Properties

- [api](dxos_registry_client.PolkadotClient.md#api)
- [transactionsHandler](dxos_registry_client.PolkadotClient.md#transactionshandler)

## Constructors

### constructor

• **new PolkadotClient**(`api`, `signFn?`)

#### Parameters

| Name | Type |
| :------ | :------ |
| `api` | `ApiPromise` |
| `signFn` | [`SignTxFunction`](../modules/dxos_registry_client.md#signtxfunction) \| `AddressOrPair` |

#### Defined in

[packages/sdk/registry-client/src/polkadot/polkadot-client.ts:16](https://github.com/dxos/dxos/blob/e3b936721/packages/sdk/registry-client/src/polkadot/polkadot-client.ts#L16)

## Properties

### api

• `Protected` **api**: `ApiPromise`

#### Defined in

[packages/sdk/registry-client/src/polkadot/polkadot-client.ts:17](https://github.com/dxos/dxos/blob/e3b936721/packages/sdk/registry-client/src/polkadot/polkadot-client.ts#L17)

___

### transactionsHandler

• `Protected` **transactionsHandler**: [`ApiTransactionHandler`](dxos_registry_client.ApiTransactionHandler.md)

#### Defined in

[packages/sdk/registry-client/src/polkadot/polkadot-client.ts:14](https://github.com/dxos/dxos/blob/e3b936721/packages/sdk/registry-client/src/polkadot/polkadot-client.ts#L14)
