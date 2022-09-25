# Class: PolkadotClient

[@dxos/registry-client](../modules/dxos_registry_client.md).PolkadotClient

Base functionality for derived clients.

## Hierarchy

- **`PolkadotClient`**

  ↳ [`PolkadotAccounts`](dxos_registry_client.PolkadotAccounts.md)

  ↳ [`PolkadotAuctions`](dxos_registry_client.PolkadotAuctions.md)

  ↳ [`PolkadotRegistry`](dxos_registry_client.PolkadotRegistry.md)

## Constructors

### constructor

**new PolkadotClient**(`api`, `signFn?`)

#### Parameters

| Name | Type |
| :------ | :------ |
| `api` | `ApiPromise` |
| `signFn` | [`SignTxFunction`](../types/dxos_registry_client.SignTxFunction.md) \| `AddressOrPair` |

#### Defined in

[packages/sdk/registry-client/src/polkadot/polkadot-client.ts:16](https://github.com/dxos/dxos/blob/db8188dae/packages/sdk/registry-client/src/polkadot/polkadot-client.ts#L16)

## Properties

### api

 `Protected` **api**: `ApiPromise`

#### Defined in

[packages/sdk/registry-client/src/polkadot/polkadot-client.ts:17](https://github.com/dxos/dxos/blob/db8188dae/packages/sdk/registry-client/src/polkadot/polkadot-client.ts#L17)

___

### transactionsHandler

 `Protected` **transactionsHandler**: [`ApiTransactionHandler`](dxos_registry_client.ApiTransactionHandler.md)

#### Defined in

[packages/sdk/registry-client/src/polkadot/polkadot-client.ts:14](https://github.com/dxos/dxos/blob/db8188dae/packages/sdk/registry-client/src/polkadot/polkadot-client.ts#L14)
