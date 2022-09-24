# Interface: PartyStateProvider

## Implemented by

- [`PartyProcessor`](../classes/PartyProcessor.md)

## Table of contents

### Properties

- [feedKeys](PartyStateProvider.md#feedkeys)
- [genesisRequired](PartyStateProvider.md#genesisrequired)
- [memberKeys](PartyStateProvider.md#memberkeys)
- [partyKey](PartyStateProvider.md#partykey)

### Methods

- [getFeedOwningMember](PartyStateProvider.md#getfeedowningmember)
- [getOfflineInvitation](PartyStateProvider.md#getofflineinvitation)
- [isFeedAdmitted](PartyStateProvider.md#isfeedadmitted)

## Properties

### feedKeys

• **feedKeys**: `PublicKey`[]

#### Defined in

[packages/echo/echo-db/src/pipeline/party-processor.ts:31](https://github.com/dxos/dxos/blob/6b1348fed/packages/echo/echo-db/src/pipeline/party-processor.ts#L31)

___

### genesisRequired

• **genesisRequired**: `boolean`

Whether PartyGenesis was already processed.

#### Defined in

[packages/echo/echo-db/src/pipeline/party-processor.ts:29](https://github.com/dxos/dxos/blob/6b1348fed/packages/echo/echo-db/src/pipeline/party-processor.ts#L29)

___

### memberKeys

• **memberKeys**: `PublicKey`[]

#### Defined in

[packages/echo/echo-db/src/pipeline/party-processor.ts:30](https://github.com/dxos/dxos/blob/6b1348fed/packages/echo/echo-db/src/pipeline/party-processor.ts#L30)

___

### partyKey

• **partyKey**: `PublicKey`

#### Defined in

[packages/echo/echo-db/src/pipeline/party-processor.ts:25](https://github.com/dxos/dxos/blob/6b1348fed/packages/echo/echo-db/src/pipeline/party-processor.ts#L25)

## Methods

### getFeedOwningMember

▸ **getFeedOwningMember**(`feedKey`): `undefined` \| `PublicKey`

#### Parameters

| Name | Type |
| :------ | :------ |
| `feedKey` | `PublicKey` |

#### Returns

`undefined` \| `PublicKey`

#### Defined in

[packages/echo/echo-db/src/pipeline/party-processor.ts:32](https://github.com/dxos/dxos/blob/6b1348fed/packages/echo/echo-db/src/pipeline/party-processor.ts#L32)

___

### getOfflineInvitation

▸ **getOfflineInvitation**(`invitationID`): `undefined` \| `SignedMessage`

#### Parameters

| Name | Type |
| :------ | :------ |
| `invitationID` | `Buffer` |

#### Returns

`undefined` \| `SignedMessage`

#### Defined in

[packages/echo/echo-db/src/pipeline/party-processor.ts:33](https://github.com/dxos/dxos/blob/6b1348fed/packages/echo/echo-db/src/pipeline/party-processor.ts#L33)

___

### isFeedAdmitted

▸ **isFeedAdmitted**(`feedKey`): `boolean`

#### Parameters

| Name | Type |
| :------ | :------ |
| `feedKey` | `PublicKey` |

#### Returns

`boolean`

#### Defined in

[packages/echo/echo-db/src/pipeline/party-processor.ts:34](https://github.com/dxos/dxos/blob/6b1348fed/packages/echo/echo-db/src/pipeline/party-processor.ts#L34)
