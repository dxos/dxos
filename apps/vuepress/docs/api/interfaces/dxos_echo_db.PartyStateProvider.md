# Interface: PartyStateProvider

[@dxos/echo-db](../modules/dxos_echo_db.md).PartyStateProvider

## Implemented by

- [`PartyProcessor`](../classes/dxos_echo_db.PartyProcessor.md)

## Table of contents

### Properties

- [feedKeys](dxos_echo_db.PartyStateProvider.md#feedkeys)
- [genesisRequired](dxos_echo_db.PartyStateProvider.md#genesisrequired)
- [memberKeys](dxos_echo_db.PartyStateProvider.md#memberkeys)
- [partyKey](dxos_echo_db.PartyStateProvider.md#partykey)

### Methods

- [getFeedOwningMember](dxos_echo_db.PartyStateProvider.md#getfeedowningmember)
- [getOfflineInvitation](dxos_echo_db.PartyStateProvider.md#getofflineinvitation)
- [isFeedAdmitted](dxos_echo_db.PartyStateProvider.md#isfeedadmitted)

## Properties

### feedKeys

• **feedKeys**: `PublicKey`[]

#### Defined in

[packages/echo/echo-db/src/pipeline/party-processor.ts:31](https://github.com/dxos/dxos/blob/e3b936721/packages/echo/echo-db/src/pipeline/party-processor.ts#L31)

___

### genesisRequired

• **genesisRequired**: `boolean`

Whether PartyGenesis was already processed.

#### Defined in

[packages/echo/echo-db/src/pipeline/party-processor.ts:29](https://github.com/dxos/dxos/blob/e3b936721/packages/echo/echo-db/src/pipeline/party-processor.ts#L29)

___

### memberKeys

• **memberKeys**: `PublicKey`[]

#### Defined in

[packages/echo/echo-db/src/pipeline/party-processor.ts:30](https://github.com/dxos/dxos/blob/e3b936721/packages/echo/echo-db/src/pipeline/party-processor.ts#L30)

___

### partyKey

• **partyKey**: `PublicKey`

#### Defined in

[packages/echo/echo-db/src/pipeline/party-processor.ts:25](https://github.com/dxos/dxos/blob/e3b936721/packages/echo/echo-db/src/pipeline/party-processor.ts#L25)

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

[packages/echo/echo-db/src/pipeline/party-processor.ts:32](https://github.com/dxos/dxos/blob/e3b936721/packages/echo/echo-db/src/pipeline/party-processor.ts#L32)

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

[packages/echo/echo-db/src/pipeline/party-processor.ts:33](https://github.com/dxos/dxos/blob/e3b936721/packages/echo/echo-db/src/pipeline/party-processor.ts#L33)

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

[packages/echo/echo-db/src/pipeline/party-processor.ts:34](https://github.com/dxos/dxos/blob/e3b936721/packages/echo/echo-db/src/pipeline/party-processor.ts#L34)
