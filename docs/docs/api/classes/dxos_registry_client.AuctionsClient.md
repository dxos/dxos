# Class: AuctionsClient

[@dxos/registry-client](../modules/dxos_registry_client.md).AuctionsClient

Main API for DXNS auctions management.

## Constructors

### constructor

**new AuctionsClient**(`_backend`)

#### Parameters

| Name | Type |
| :------ | :------ |
| `_backend` | [`AuctionsClientBackend`](../interfaces/dxos_registry_client.AuctionsClientBackend.md) |

#### Defined in

[packages/sdk/registry-client/src/api/auctions-client.ts:16](https://github.com/dxos/dxos/blob/main/packages/sdk/registry-client/src/api/auctions-client.ts#L16)

## Methods

### bidAuction

**bidAuction**(`name`, `amount`): `Promise`<`void`\>

Offers a new amount in the auction.

#### Parameters

| Name | Type | Description |
| :------ | :------ | :------ |
| `name` | `string` | An object of the auction. |
| `amount` | `number` | The offered amount. |

#### Returns

`Promise`<`void`\>

#### Defined in

[packages/sdk/registry-client/src/api/auctions-client.ts:48](https://github.com/dxos/dxos/blob/main/packages/sdk/registry-client/src/api/auctions-client.ts#L48)

___

### claimAuction

**claimAuction**(`domainName`, `account`): `Promise`<[`DomainKey`](dxos_registry_client.DomainKey.md)\>

Allows for transferring the ownership of the name to the highest bidder.

#### Parameters

| Name | Type | Description |
| :------ | :------ | :------ |
| `domainName` | `string` | - |
| `account` | [`AccountKey`](dxos_registry_client.AccountKey.md) | The DXNS Account that will claim the ownership of the domain. |

#### Returns

`Promise`<[`DomainKey`](dxos_registry_client.DomainKey.md)\>

#### Defined in

[packages/sdk/registry-client/src/api/auctions-client.ts:76](https://github.com/dxos/dxos/blob/main/packages/sdk/registry-client/src/api/auctions-client.ts#L76)

___

### closeAuction

**closeAuction**(`name`): `Promise`<`void`\>

Closes an auction. Note! This DOES NOT transfer the ownership to the highest bidder. They need to claim
by invoking separate operation.

#### Parameters

| Name | Type | Description |
| :------ | :------ | :------ |
| `name` | `string` | An object of the auction. |

#### Returns

`Promise`<`void`\>

#### Defined in

[packages/sdk/registry-client/src/api/auctions-client.ts:57](https://github.com/dxos/dxos/blob/main/packages/sdk/registry-client/src/api/auctions-client.ts#L57)

___

### createAuction

**createAuction**(`name`, `startAmount`): `Promise`<`void`\>

Creates a new auction.

#### Parameters

| Name | Type | Description |
| :------ | :------ | :------ |
| `name` | `string` | An object of the auction. |
| `startAmount` | `number` | The initial amount offered. |

#### Returns

`Promise`<`void`\>

#### Defined in

[packages/sdk/registry-client/src/api/auctions-client.ts:39](https://github.com/dxos/dxos/blob/main/packages/sdk/registry-client/src/api/auctions-client.ts#L39)

___

### forceCloseAuction

**forceCloseAuction**(`name`, `sudoSignFn`): `Promise`<`void`\>

Forces close an auction. This arbitrarily closes the ongoing auction even its time is not reached yet.
Note! This is reserved to sudo/admin accounts.

#### Parameters

| Name | Type | Description |
| :------ | :------ | :------ |
| `name` | `string` | An object of the auction. |
| `sudoSignFn` | [`SignTxFunction`](../types/dxos_registry_client.SignTxFunction.md) \| `AddressOrPair` | A transaction signing function using a sudo/admin account with rights to to execute this high-privilege operation. |

#### Returns

`Promise`<`void`\>

#### Defined in

[packages/sdk/registry-client/src/api/auctions-client.ts:67](https://github.com/dxos/dxos/blob/main/packages/sdk/registry-client/src/api/auctions-client.ts#L67)

___

### getAuction

**getAuction**(`name`): `Promise`<`undefined` \| [`Auction`](../interfaces/dxos_registry_client.Auction.md)\>

Get an auction by name.

#### Parameters

| Name | Type |
| :------ | :------ |
| `name` | `string` |

#### Returns

`Promise`<`undefined` \| [`Auction`](../interfaces/dxos_registry_client.Auction.md)\>

#### Defined in

[packages/sdk/registry-client/src/api/auctions-client.ts:23](https://github.com/dxos/dxos/blob/main/packages/sdk/registry-client/src/api/auctions-client.ts#L23)

___

### listAuctions

**listAuctions**(): `Promise`<[`Auction`](../interfaces/dxos_registry_client.Auction.md)[]\>

Returns a collection of all auctions (ongoing and closed) in DXOS.

#### Returns

`Promise`<[`Auction`](../interfaces/dxos_registry_client.Auction.md)[]\>

#### Defined in

[packages/sdk/registry-client/src/api/auctions-client.ts:30](https://github.com/dxos/dxos/blob/main/packages/sdk/registry-client/src/api/auctions-client.ts#L30)
