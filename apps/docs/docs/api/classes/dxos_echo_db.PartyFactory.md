---
id: "dxos_echo_db.PartyFactory"
title: "Class: PartyFactory"
sidebar_label: "PartyFactory"
custom_edit_url: null
---

[@dxos/echo-db](../modules/dxos_echo_db.md).PartyFactory

Creates and constructs party instances.

## Constructors

### constructor

• **new PartyFactory**(`_identityProvider`, `_networkManager`, `_modelFactory`, `_snapshotStore`, `_feedProviderFactory`, `_metadataStore`, `_options?`)

#### Parameters

| Name | Type |
| :------ | :------ |
| `_identityProvider` | `Provider`<`undefined` \| `IdentityCredentials`\> |
| `_networkManager` | `NetworkManager` |
| `_modelFactory` | `ModelFactory` |
| `_snapshotStore` | [`SnapshotStore`](dxos_echo_db.SnapshotStore.md) |
| `_feedProviderFactory` | (`partyKey`: `PublicKey`) => [`PartyFeedProvider`](dxos_echo_db.PartyFeedProvider.md) |
| `_metadataStore` | [`MetadataStore`](dxos_echo_db.MetadataStore.md) |
| `_options` | [`PipelineOptions`](../interfaces/dxos_echo_db.PipelineOptions.md) |

#### Defined in

[packages/echo/echo-db/src/parties/party-factory.ts:40](https://github.com/dxos/protocols/blob/6f4c34af3/packages/echo/echo-db/src/parties/party-factory.ts#L40)

## Methods

### cloneParty

▸ **cloneParty**(`snapshot`): `Promise`<[`DataParty`](dxos_echo_db.DataParty.md)\>

#### Parameters

| Name | Type |
| :------ | :------ |
| `snapshot` | `PartySnapshot` |

#### Returns

`Promise`<[`DataParty`](dxos_echo_db.DataParty.md)\>

#### Defined in

[packages/echo/echo-db/src/parties/party-factory.ts:199](https://github.com/dxos/protocols/blob/6f4c34af3/packages/echo/echo-db/src/parties/party-factory.ts#L199)

___

### constructParty

▸ **constructParty**(`partyKey`, `initialTimeframe?`): `Promise`<[`DataParty`](dxos_echo_db.DataParty.md)\>

Constructs a party object from an existing set of feeds.

#### Parameters

| Name | Type |
| :------ | :------ |
| `partyKey` | `PublicKey` |
| `initialTimeframe?` | `Timeframe` |

#### Returns

`Promise`<[`DataParty`](dxos_echo_db.DataParty.md)\>

#### Defined in

[packages/echo/echo-db/src/parties/party-factory.ts:117](https://github.com/dxos/protocols/blob/6f4c34af3/packages/echo/echo-db/src/parties/party-factory.ts#L117)

___

### constructPartyFromSnapshot

▸ **constructPartyFromSnapshot**(`snapshot`): `Promise`<[`DataParty`](dxos_echo_db.DataParty.md)\>

#### Parameters

| Name | Type |
| :------ | :------ |
| `snapshot` | `PartySnapshot` |

#### Returns

`Promise`<[`DataParty`](dxos_echo_db.DataParty.md)\>

#### Defined in

[packages/echo/echo-db/src/parties/party-factory.ts:139](https://github.com/dxos/protocols/blob/6f4c34af3/packages/echo/echo-db/src/parties/party-factory.ts#L139)

___

### createParty

▸ **createParty**(): `Promise`<[`DataParty`](dxos_echo_db.DataParty.md)\>

Create a new party with a new feed for it. Writes a party genensis message to this feed.

#### Returns

`Promise`<[`DataParty`](dxos_echo_db.DataParty.md)\>

#### Defined in

[packages/echo/echo-db/src/parties/party-factory.ts:53](https://github.com/dxos/protocols/blob/6f4c34af3/packages/echo/echo-db/src/parties/party-factory.ts#L53)

___

### joinParty

▸ **joinParty**(`invitationDescriptor`, `secretProvider`): `Promise`<[`DataParty`](dxos_echo_db.DataParty.md)\>

#### Parameters

| Name | Type |
| :------ | :------ |
| `invitationDescriptor` | [`InvitationDescriptor`](dxos_echo_db.InvitationDescriptor.md) |
| `secretProvider` | `SecretProvider` |

#### Returns

`Promise`<[`DataParty`](dxos_echo_db.DataParty.md)\>

#### Defined in

[packages/echo/echo-db/src/parties/party-factory.ts:148](https://github.com/dxos/protocols/blob/6f4c34af3/packages/echo/echo-db/src/parties/party-factory.ts#L148)
