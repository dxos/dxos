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

[packages/echo/echo-db/src/parties/party-manager.ts:48](https://github.com/dxos/dxos/blob/b06737400/packages/echo/echo-db/src/parties/party-manager.ts#L48)

## Properties

### \_open

• `Private` **\_open**: `boolean` = `false`

#### Defined in

[packages/echo/echo-db/src/parties/party-manager.ts:46](https://github.com/dxos/dxos/blob/b06737400/packages/echo/echo-db/src/parties/party-manager.ts#L46)

___

### \_parties

• `Private` `Readonly` **\_parties**: `ComplexMap`<`PublicKey`, [`DataParty`](dxos_echo_db.DataParty.md)\>

#### Defined in

[packages/echo/echo-db/src/parties/party-manager.ts:44](https://github.com/dxos/dxos/blob/b06737400/packages/echo/echo-db/src/parties/party-manager.ts#L44)

___

### update

• `Readonly` **update**: `Event`<[`DataParty`](dxos_echo_db.DataParty.md)\>

#### Defined in

[packages/echo/echo-db/src/parties/party-manager.ts:41](https://github.com/dxos/dxos/blob/b06737400/packages/echo/echo-db/src/parties/party-manager.ts#L41)

## Accessors

### isOpen

• `get` **isOpen**(): `boolean`

#### Returns

`boolean`

#### Defined in

[packages/echo/echo-db/src/parties/party-manager.ts:55](https://github.com/dxos/dxos/blob/b06737400/packages/echo/echo-db/src/parties/party-manager.ts#L55)

___

### parties

• `get` **parties**(): [`DataParty`](dxos_echo_db.DataParty.md)[]

#### Returns

[`DataParty`](dxos_echo_db.DataParty.md)[]

#### Defined in

[packages/echo/echo-db/src/parties/party-manager.ts:59](https://github.com/dxos/dxos/blob/b06737400/packages/echo/echo-db/src/parties/party-manager.ts#L59)

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

[packages/echo/echo-db/src/parties/party-manager.ts:322](https://github.com/dxos/dxos/blob/b06737400/packages/echo/echo-db/src/parties/party-manager.ts#L322)

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

[packages/echo/echo-db/src/parties/party-manager.ts:233](https://github.com/dxos/dxos/blob/b06737400/packages/echo/echo-db/src/parties/party-manager.ts#L233)

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

[packages/echo/echo-db/src/parties/party-manager.ts:282](https://github.com/dxos/dxos/blob/b06737400/packages/echo/echo-db/src/parties/party-manager.ts#L282)

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

[packages/echo/echo-db/src/parties/party-manager.ts:267](https://github.com/dxos/dxos/blob/b06737400/packages/echo/echo-db/src/parties/party-manager.ts#L267)

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

[packages/echo/echo-db/src/parties/party-manager.ts:163](https://github.com/dxos/dxos/blob/b06737400/packages/echo/echo-db/src/parties/party-manager.ts#L163)

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

[packages/echo/echo-db/src/parties/party-manager.ts:211](https://github.com/dxos/dxos/blob/b06737400/packages/echo/echo-db/src/parties/party-manager.ts#L211)

___

### close

▸ **close**(): `Promise`<`void`\>

#### Returns

`Promise`<`void`\>

#### Defined in

[packages/echo/echo-db/src/parties/party-manager.ts:120](https://github.com/dxos/dxos/blob/b06737400/packages/echo/echo-db/src/parties/party-manager.ts#L120)

___

### createParty

▸ **createParty**(): `Promise`<[`DataParty`](dxos_echo_db.DataParty.md)\>

Creates a new party, writing its genesis block to the stream.

#### Returns

`Promise`<[`DataParty`](dxos_echo_db.DataParty.md)\>

#### Defined in

[packages/echo/echo-db/src/parties/party-manager.ts:146](https://github.com/dxos/dxos/blob/b06737400/packages/echo/echo-db/src/parties/party-manager.ts#L146)

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

[packages/echo/echo-db/src/parties/party-manager.ts:189](https://github.com/dxos/dxos/blob/b06737400/packages/echo/echo-db/src/parties/party-manager.ts#L189)

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

[packages/echo/echo-db/src/parties/party-manager.ts:63](https://github.com/dxos/dxos/blob/b06737400/packages/echo/echo-db/src/parties/party-manager.ts#L63)
