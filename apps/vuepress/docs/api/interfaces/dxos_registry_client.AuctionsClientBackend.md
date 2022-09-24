# Interface: AuctionsClientBackend

[@dxos/registry-client](../modules/dxos_registry_client.md).AuctionsClientBackend

Auctions operations supported by DXNS.

## Implemented by

- [`PolkadotAuctions`](../classes/dxos_registry_client.PolkadotAuctions.md)

## Table of contents

### Methods

- [bidAuction](dxos_registry_client.AuctionsClientBackend.md#bidauction)
- [claimAuction](dxos_registry_client.AuctionsClientBackend.md#claimauction)
- [closeAuction](dxos_registry_client.AuctionsClientBackend.md#closeauction)
- [createAuction](dxos_registry_client.AuctionsClientBackend.md#createauction)
- [forceCloseAuction](dxos_registry_client.AuctionsClientBackend.md#forcecloseauction)
- [getAuction](dxos_registry_client.AuctionsClientBackend.md#getauction)
- [listAuctions](dxos_registry_client.AuctionsClientBackend.md#listauctions)

## Methods

### bidAuction

▸ **bidAuction**(`name`, `amount`): `Promise`<`void`\>

#### Parameters

| Name | Type |
| :------ | :------ |
| `name` | `string` |
| `amount` | `number` |

#### Returns

`Promise`<`void`\>

#### Defined in

[packages/sdk/registry-client/src/api/auctions.ts:49](https://github.com/dxos/dxos/blob/e3b936721/packages/sdk/registry-client/src/api/auctions.ts#L49)

___

### claimAuction

▸ **claimAuction**(`name`, `account`): `Promise`<[`DomainKey`](../classes/dxos_registry_client.DomainKey.md)\>

#### Parameters

| Name | Type |
| :------ | :------ |
| `name` | `string` |
| `account` | [`AccountKey`](../classes/dxos_registry_client.AccountKey.md) |

#### Returns

`Promise`<[`DomainKey`](../classes/dxos_registry_client.DomainKey.md)\>

#### Defined in

[packages/sdk/registry-client/src/api/auctions.ts:53](https://github.com/dxos/dxos/blob/e3b936721/packages/sdk/registry-client/src/api/auctions.ts#L53)

___

### closeAuction

▸ **closeAuction**(`name`): `Promise`<`void`\>

#### Parameters

| Name | Type |
| :------ | :------ |
| `name` | `string` |

#### Returns

`Promise`<`void`\>

#### Defined in

[packages/sdk/registry-client/src/api/auctions.ts:50](https://github.com/dxos/dxos/blob/e3b936721/packages/sdk/registry-client/src/api/auctions.ts#L50)

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

#### Defined in

[packages/sdk/registry-client/src/api/auctions.ts:48](https://github.com/dxos/dxos/blob/e3b936721/packages/sdk/registry-client/src/api/auctions.ts#L48)

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

#### Defined in

[packages/sdk/registry-client/src/api/auctions.ts:52](https://github.com/dxos/dxos/blob/e3b936721/packages/sdk/registry-client/src/api/auctions.ts#L52)

___

### getAuction

▸ **getAuction**(`name`): `Promise`<`undefined` \| [`Auction`](dxos_registry_client.Auction.md)\>

#### Parameters

| Name | Type |
| :------ | :------ |
| `name` | `string` |

#### Returns

`Promise`<`undefined` \| [`Auction`](dxos_registry_client.Auction.md)\>

#### Defined in

[packages/sdk/registry-client/src/api/auctions.ts:46](https://github.com/dxos/dxos/blob/e3b936721/packages/sdk/registry-client/src/api/auctions.ts#L46)

___

### listAuctions

▸ **listAuctions**(): `Promise`<[`Auction`](dxos_registry_client.Auction.md)[]\>

#### Returns

`Promise`<[`Auction`](dxos_registry_client.Auction.md)[]\>

#### Defined in

[packages/sdk/registry-client/src/api/auctions.ts:47](https://github.com/dxos/dxos/blob/e3b936721/packages/sdk/registry-client/src/api/auctions.ts#L47)
