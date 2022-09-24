# Class: PolkadotAuctions

[@dxos/registry-client](../modules/dxos_registry_client.md).PolkadotAuctions

Polkadot DXNS auctions client backend.

## Hierarchy

- [`PolkadotClient`](dxos_registry_client.PolkadotClient.md)

  ↳ **`PolkadotAuctions`**

## Implements

- [`AuctionsClientBackend`](../interfaces/dxos_registry_client.AuctionsClientBackend.md)

## Table of contents

### Constructors

- [constructor](dxos_registry_client.PolkadotAuctions.md#constructor)

### Properties

- [api](dxos_registry_client.PolkadotAuctions.md#api)
- [transactionsHandler](dxos_registry_client.PolkadotAuctions.md#transactionshandler)

### Methods

- [\_decodeAuction](dxos_registry_client.PolkadotAuctions.md#_decodeauction)
- [bidAuction](dxos_registry_client.PolkadotAuctions.md#bidauction)
- [claimAuction](dxos_registry_client.PolkadotAuctions.md#claimauction)
- [closeAuction](dxos_registry_client.PolkadotAuctions.md#closeauction)
- [createAuction](dxos_registry_client.PolkadotAuctions.md#createauction)
- [forceCloseAuction](dxos_registry_client.PolkadotAuctions.md#forcecloseauction)
- [getAuction](dxos_registry_client.PolkadotAuctions.md#getauction)
- [listAuctions](dxos_registry_client.PolkadotAuctions.md#listauctions)

## Constructors

### constructor

• **new PolkadotAuctions**(`api`, `signFn?`)

#### Parameters

| Name | Type |
| :------ | :------ |
| `api` | `ApiPromise` |
| `signFn` | [`SignTxFunction`](../modules/dxos_registry_client.md#signtxfunction) \| `AddressOrPair` |

#### Inherited from

[PolkadotClient](dxos_registry_client.PolkadotClient.md).[constructor](dxos_registry_client.PolkadotClient.md#constructor)

#### Defined in

[packages/sdk/registry-client/src/polkadot/polkadot-client.ts:16](https://github.com/dxos/dxos/blob/32ae9b579/packages/sdk/registry-client/src/polkadot/polkadot-client.ts#L16)

## Properties

### api

• `Protected` **api**: `ApiPromise`

#### Inherited from

[PolkadotClient](dxos_registry_client.PolkadotClient.md).[api](dxos_registry_client.PolkadotClient.md#api)

#### Defined in

[packages/sdk/registry-client/src/polkadot/polkadot-client.ts:17](https://github.com/dxos/dxos/blob/32ae9b579/packages/sdk/registry-client/src/polkadot/polkadot-client.ts#L17)

___

### transactionsHandler

• `Protected` **transactionsHandler**: [`ApiTransactionHandler`](dxos_registry_client.ApiTransactionHandler.md)

#### Inherited from

[PolkadotClient](dxos_registry_client.PolkadotClient.md).[transactionsHandler](dxos_registry_client.PolkadotClient.md#transactionshandler)

#### Defined in

[packages/sdk/registry-client/src/polkadot/polkadot-client.ts:14](https://github.com/dxos/dxos/blob/32ae9b579/packages/sdk/registry-client/src/polkadot/polkadot-client.ts#L14)

## Methods

### \_decodeAuction

▸ `Private` **_decodeAuction**(`auction`): [`Auction`](../interfaces/dxos_registry_client.Auction.md)

#### Parameters

| Name | Type |
| :------ | :------ |
| `auction` | `Auction` |

#### Returns

[`Auction`](../interfaces/dxos_registry_client.Auction.md)

#### Defined in

[packages/sdk/registry-client/src/polkadot/auctions.ts:55](https://github.com/dxos/dxos/blob/32ae9b579/packages/sdk/registry-client/src/polkadot/auctions.ts#L55)

___

### bidAuction

▸ **bidAuction**(`name`, `amount`): `Promise`<`void`\>

#### Parameters

| Name | Type |
| :------ | :------ |
| `name` | `string` |
| `amount` | `number` |

#### Returns

`Promise`<`void`\>

#### Implementation of

[AuctionsClientBackend](../interfaces/dxos_registry_client.AuctionsClientBackend.md).[bidAuction](../interfaces/dxos_registry_client.AuctionsClientBackend.md#bidauction)

#### Defined in

[packages/sdk/registry-client/src/polkadot/auctions.ts:37](https://github.com/dxos/dxos/blob/32ae9b579/packages/sdk/registry-client/src/polkadot/auctions.ts#L37)

___

### claimAuction

▸ **claimAuction**(`domainName`, `account`): `Promise`<[`DomainKey`](dxos_registry_client.DomainKey.md)\>

#### Parameters

| Name | Type |
| :------ | :------ |
| `domainName` | `string` |
| `account` | [`AccountKey`](dxos_registry_client.AccountKey.md) |

#### Returns

`Promise`<[`DomainKey`](dxos_registry_client.DomainKey.md)\>

#### Implementation of

[AuctionsClientBackend](../interfaces/dxos_registry_client.AuctionsClientBackend.md).[claimAuction](../interfaces/dxos_registry_client.AuctionsClientBackend.md#claimauction)

#### Defined in

[packages/sdk/registry-client/src/polkadot/auctions.ts:49](https://github.com/dxos/dxos/blob/32ae9b579/packages/sdk/registry-client/src/polkadot/auctions.ts#L49)

___

### closeAuction

▸ **closeAuction**(`name`): `Promise`<`void`\>

#### Parameters

| Name | Type |
| :------ | :------ |
| `name` | `string` |

#### Returns

`Promise`<`void`\>

#### Implementation of

[AuctionsClientBackend](../interfaces/dxos_registry_client.AuctionsClientBackend.md).[closeAuction](../interfaces/dxos_registry_client.AuctionsClientBackend.md#closeauction)

#### Defined in

[packages/sdk/registry-client/src/polkadot/auctions.ts:41](https://github.com/dxos/dxos/blob/32ae9b579/packages/sdk/registry-client/src/polkadot/auctions.ts#L41)

___

### createAuction

▸ **createAuction**(`name`, `startAmount`): `Promise`<`void`\>

#### Parameters

| Name | Type |
| :------ | :------ |
| `name` | `string` |
| `startAmount` | `number` |

#### Returns

`Promise`<`void`\>

#### Implementation of

[AuctionsClientBackend](../interfaces/dxos_registry_client.AuctionsClientBackend.md).[createAuction](../interfaces/dxos_registry_client.AuctionsClientBackend.md#createauction)

#### Defined in

[packages/sdk/registry-client/src/polkadot/auctions.ts:33](https://github.com/dxos/dxos/blob/32ae9b579/packages/sdk/registry-client/src/polkadot/auctions.ts#L33)

___

### forceCloseAuction

▸ **forceCloseAuction**(`name`, `sudoSignFn`): `Promise`<`void`\>

#### Parameters

| Name | Type |
| :------ | :------ |
| `name` | `string` |
| `sudoSignFn` | [`SignTxFunction`](../modules/dxos_registry_client.md#signtxfunction) \| `AddressOrPair` |

#### Returns

`Promise`<`void`\>

#### Implementation of

[AuctionsClientBackend](../interfaces/dxos_registry_client.AuctionsClientBackend.md).[forceCloseAuction](../interfaces/dxos_registry_client.AuctionsClientBackend.md#forcecloseauction)

#### Defined in

[packages/sdk/registry-client/src/polkadot/auctions.ts:45](https://github.com/dxos/dxos/blob/32ae9b579/packages/sdk/registry-client/src/polkadot/auctions.ts#L45)

___

### getAuction

▸ **getAuction**(`name`): `Promise`<`undefined` \| [`Auction`](../interfaces/dxos_registry_client.Auction.md)\>

#### Parameters

| Name | Type |
| :------ | :------ |
| `name` | `string` |

#### Returns

`Promise`<`undefined` \| [`Auction`](../interfaces/dxos_registry_client.Auction.md)\>

#### Implementation of

[AuctionsClientBackend](../interfaces/dxos_registry_client.AuctionsClientBackend.md).[getAuction](../interfaces/dxos_registry_client.AuctionsClientBackend.md#getauction)

#### Defined in

[packages/sdk/registry-client/src/polkadot/auctions.ts:16](https://github.com/dxos/dxos/blob/32ae9b579/packages/sdk/registry-client/src/polkadot/auctions.ts#L16)

___

### listAuctions

▸ **listAuctions**(): `Promise`<[`Auction`](../interfaces/dxos_registry_client.Auction.md)[]\>

#### Returns

`Promise`<[`Auction`](../interfaces/dxos_registry_client.Auction.md)[]\>

#### Implementation of

[AuctionsClientBackend](../interfaces/dxos_registry_client.AuctionsClientBackend.md).[listAuctions](../interfaces/dxos_registry_client.AuctionsClientBackend.md#listauctions)

#### Defined in

[packages/sdk/registry-client/src/polkadot/auctions.ts:25](https://github.com/dxos/dxos/blob/32ae9b579/packages/sdk/registry-client/src/polkadot/auctions.ts#L25)
