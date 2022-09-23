---
id: "dxos_echo_db.PartyStateProvider"
title: "Interface: PartyStateProvider"
sidebar_label: "PartyStateProvider"
custom_edit_url: null
---

[@dxos/echo-db](../modules/dxos_echo_db.md).PartyStateProvider

## Implemented by

- [`PartyProcessor`](../classes/dxos_echo_db.PartyProcessor.md)

## Properties

### feedKeys

• **feedKeys**: `PublicKey`[]

#### Defined in

[packages/echo/echo-db/src/pipeline/party-processor.ts:36](https://github.com/dxos/protocols/blob/6f4c34af3/packages/echo/echo-db/src/pipeline/party-processor.ts#L36)

___

### genesisRequired

• **genesisRequired**: `boolean`

Whether PartyGenesis was already processed.

#### Defined in

[packages/echo/echo-db/src/pipeline/party-processor.ts:34](https://github.com/dxos/protocols/blob/6f4c34af3/packages/echo/echo-db/src/pipeline/party-processor.ts#L34)

___

### memberKeys

• **memberKeys**: `PublicKey`[]

#### Defined in

[packages/echo/echo-db/src/pipeline/party-processor.ts:35](https://github.com/dxos/protocols/blob/6f4c34af3/packages/echo/echo-db/src/pipeline/party-processor.ts#L35)

___

### partyKey

• **partyKey**: `PublicKey`

#### Defined in

[packages/echo/echo-db/src/pipeline/party-processor.ts:29](https://github.com/dxos/protocols/blob/6f4c34af3/packages/echo/echo-db/src/pipeline/party-processor.ts#L29)

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

[packages/echo/echo-db/src/pipeline/party-processor.ts:37](https://github.com/dxos/protocols/blob/6f4c34af3/packages/echo/echo-db/src/pipeline/party-processor.ts#L37)

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

[packages/echo/echo-db/src/pipeline/party-processor.ts:40](https://github.com/dxos/protocols/blob/6f4c34af3/packages/echo/echo-db/src/pipeline/party-processor.ts#L40)

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

[packages/echo/echo-db/src/pipeline/party-processor.ts:38](https://github.com/dxos/protocols/blob/6f4c34af3/packages/echo/echo-db/src/pipeline/party-processor.ts#L38)
