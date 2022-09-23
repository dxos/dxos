---
id: "dxos_echo_db.PartyManager"
title: "Class: PartyManager"
sidebar_label: "PartyManager"
custom_edit_url: null
---

[@dxos/echo-db](../modules/dxos_echo_db.md).PartyManager

Top-level class manages the complete life-cycle of parties.

`ECHO` => `PartyManager` => `DataParty` => `PartyCore`

## Constructors

### constructor

• **new PartyManager**(`_metadataStore`, `_snapshotStore`, `_identityProvider`, `_partyFactory`)

#### Parameters

| Name | Type |
| :------ | :------ |
| `_metadataStore` | [`MetadataStore`](dxos_echo_db.MetadataStore.md) |
| `_snapshotStore` | [`SnapshotStore`](dxos_echo_db.SnapshotStore.md) |
| `_identityProvider` | `Provider`<`undefined` \| `IdentityCredentials`\> |
| `_partyFactory` | [`PartyFactory`](dxos_echo_db.PartyFactory.md) |

#### Defined in

[packages/echo/echo-db/src/parties/party-manager.ts:47](https://github.com/dxos/protocols/blob/6f4c34af3/packages/echo/echo-db/src/parties/party-manager.ts#L47)

## Properties

### \_open

• `Private` **\_open**: `boolean` = `false`

#### Defined in

[packages/echo/echo-db/src/parties/party-manager.ts:45](https://github.com/dxos/protocols/blob/6f4c34af3/packages/echo/echo-db/src/parties/party-manager.ts#L45)

___

### \_parties

• `Private` `Readonly` **\_parties**: `ComplexMap`<`PublicKey`, [`DataParty`](dxos_echo_db.DataParty.md)\>

#### Defined in

[packages/echo/echo-db/src/parties/party-manager.ts:43](https://github.com/dxos/protocols/blob/6f4c34af3/packages/echo/echo-db/src/parties/party-manager.ts#L43)

___

### update

• `Readonly` **update**: `Event`<[`DataParty`](dxos_echo_db.DataParty.md)\>

#### Defined in

[packages/echo/echo-db/src/parties/party-manager.ts:40](https://github.com/dxos/protocols/blob/6f4c34af3/packages/echo/echo-db/src/parties/party-manager.ts#L40)

## Accessors

### isOpen

• `get` **isOpen**(): `boolean`

#### Returns

`boolean`

#### Defined in

[packages/echo/echo-db/src/parties/party-manager.ts:54](https://github.com/dxos/protocols/blob/6f4c34af3/packages/echo/echo-db/src/parties/party-manager.ts#L54)

___

### parties

• `get` **parties**(): [`DataParty`](dxos_echo_db.DataParty.md)[]

#### Returns

[`DataParty`](dxos_echo_db.DataParty.md)[]

#### Defined in

[packages/echo/echo-db/src/parties/party-manager.ts:58](https://github.com/dxos/protocols/blob/6f4c34af3/packages/echo/echo-db/src/parties/party-manager.ts#L58)

## Methods

### \_recordPartyJoining

▸ `Private` **_recordPartyJoining**(`party`): `Promise`<`void`\>

#### Parameters

| Name | Type |
| :------ | :------ |
| `party` | [`DataParty`](dxos_echo_db.DataParty.md) |

#### Returns

`Promise`<`void`\>

#### Defined in

[packages/echo/echo-db/src/parties/party-manager.ts:321](https://github.com/dxos/protocols/blob/6f4c34af3/packages/echo/echo-db/src/parties/party-manager.ts#L321)

___

### \_setParty

▸ `Private` **_setParty**(`party`): `void`

#### Parameters

| Name | Type |
| :------ | :------ |
| `party` | [`DataParty`](dxos_echo_db.DataParty.md) |

#### Returns

`void`

#### Defined in

[packages/echo/echo-db/src/parties/party-manager.ts:232](https://github.com/dxos/protocols/blob/6f4c34af3/packages/echo/echo-db/src/parties/party-manager.ts#L232)

___

### \_updateContactList

▸ `Private` **_updateContactList**(`party`): `Promise`<`void`\>

#### Parameters

| Name | Type |
| :------ | :------ |
| `party` | [`DataParty`](dxos_echo_db.DataParty.md) |

#### Returns

`Promise`<`void`\>

#### Defined in

[packages/echo/echo-db/src/parties/party-manager.ts:281](https://github.com/dxos/protocols/blob/6f4c34af3/packages/echo/echo-db/src/parties/party-manager.ts#L281)

___

### \_updatePartyTitle

▸ `Private` **_updatePartyTitle**(`party`): `Promise`<`void`\>

#### Parameters

| Name | Type |
| :------ | :------ |
| `party` | [`DataParty`](dxos_echo_db.DataParty.md) |

#### Returns

`Promise`<`void`\>

#### Defined in

[packages/echo/echo-db/src/parties/party-manager.ts:266](https://github.com/dxos/protocols/blob/6f4c34af3/packages/echo/echo-db/src/parties/party-manager.ts#L266)

___

### addParty

▸ **addParty**(`partyKey`, `genesisFeedKey`): `Promise`<`undefined` \| [`DataParty`](dxos_echo_db.DataParty.md)\>

Construct a party object and start replicating with the remote peer that created that party.

#### Parameters

| Name | Type |
| :------ | :------ |
| `partyKey` | `PublicKey` |
| `genesisFeedKey` | `PublicKey` |

#### Returns

`Promise`<`undefined` \| [`DataParty`](dxos_echo_db.DataParty.md)\>

#### Defined in

[packages/echo/echo-db/src/parties/party-manager.ts:162](https://github.com/dxos/protocols/blob/6f4c34af3/packages/echo/echo-db/src/parties/party-manager.ts#L162)

___

### cloneParty

▸ **cloneParty**(`snapshot`): `Promise`<[`DataParty`](dxos_echo_db.DataParty.md)\>

#### Parameters

| Name | Type |
| :------ | :------ |
| `snapshot` | `PartySnapshot` |

#### Returns

`Promise`<[`DataParty`](dxos_echo_db.DataParty.md)\>

#### Defined in

[packages/echo/echo-db/src/parties/party-manager.ts:210](https://github.com/dxos/protocols/blob/6f4c34af3/packages/echo/echo-db/src/parties/party-manager.ts#L210)

___

### close

▸ **close**(): `Promise`<`void`\>

#### Returns

`Promise`<`void`\>

#### Defined in

[packages/echo/echo-db/src/parties/party-manager.ts:119](https://github.com/dxos/protocols/blob/6f4c34af3/packages/echo/echo-db/src/parties/party-manager.ts#L119)

___

### createParty

▸ **createParty**(): `Promise`<[`DataParty`](dxos_echo_db.DataParty.md)\>

Creates a new party, writing its genesis block to the stream.

#### Returns

`Promise`<[`DataParty`](dxos_echo_db.DataParty.md)\>

#### Defined in

[packages/echo/echo-db/src/parties/party-manager.ts:145](https://github.com/dxos/protocols/blob/6f4c34af3/packages/echo/echo-db/src/parties/party-manager.ts#L145)

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

[packages/echo/echo-db/src/parties/party-manager.ts:188](https://github.com/dxos/protocols/blob/6f4c34af3/packages/echo/echo-db/src/parties/party-manager.ts#L188)

___

### open

▸ **open**(`onProgressCallback?`): `Promise`<`void`\>

#### Parameters

| Name | Type |
| :------ | :------ |
| `onProgressCallback?` | (`progress`: [`OpenProgress`](../interfaces/dxos_echo_db.OpenProgress.md)) => `void` |

#### Returns

`Promise`<`void`\>

#### Defined in

[packages/echo/echo-db/src/parties/party-manager.ts:62](https://github.com/dxos/protocols/blob/6f4c34af3/packages/echo/echo-db/src/parties/party-manager.ts#L62)
