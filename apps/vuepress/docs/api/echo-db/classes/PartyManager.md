# Class: PartyManager

Top-level class manages the complete life-cycle of parties.

`ECHO` => `PartyManager` => `DataParty` => `PartyCore`

## Table of contents

### Constructors

- [constructor](PartyManager.md#constructor)

### Properties

- [\_open](PartyManager.md#_open)
- [\_parties](PartyManager.md#_parties)
- [update](PartyManager.md#update)

### Accessors

- [isOpen](PartyManager.md#isopen)
- [parties](PartyManager.md#parties)

### Methods

- [\_recordPartyJoining](PartyManager.md#_recordpartyjoining)
- [\_setParty](PartyManager.md#_setparty)
- [\_updateContactList](PartyManager.md#_updatecontactlist)
- [\_updatePartyTitle](PartyManager.md#_updatepartytitle)
- [addParty](PartyManager.md#addparty)
- [cloneParty](PartyManager.md#cloneparty)
- [close](PartyManager.md#close)
- [createParty](PartyManager.md#createparty)
- [joinParty](PartyManager.md#joinparty)
- [open](PartyManager.md#open)

## Constructors

### constructor

• **new PartyManager**(`_metadataStore`, `_snapshotStore`, `_identityProvider`, `_partyFactory`)

#### Parameters

| Name | Type |
| :------ | :------ |
| `_metadataStore` | [`MetadataStore`](MetadataStore.md) |
| `_snapshotStore` | [`SnapshotStore`](SnapshotStore.md) |
| `_identityProvider` | `Provider`<`undefined` \| `IdentityCredentials`\> |
| `_partyFactory` | [`PartyFactory`](PartyFactory.md) |

#### Defined in

[packages/echo/echo-db/src/parties/party-manager.ts:48](https://github.com/dxos/dxos/blob/6b1348fed/packages/echo/echo-db/src/parties/party-manager.ts#L48)

## Properties

### \_open

• `Private` **\_open**: `boolean` = `false`

#### Defined in

[packages/echo/echo-db/src/parties/party-manager.ts:46](https://github.com/dxos/dxos/blob/6b1348fed/packages/echo/echo-db/src/parties/party-manager.ts#L46)

___

### \_parties

• `Private` `Readonly` **\_parties**: `ComplexMap`<`PublicKey`, [`DataParty`](DataParty.md)\>

#### Defined in

[packages/echo/echo-db/src/parties/party-manager.ts:44](https://github.com/dxos/dxos/blob/6b1348fed/packages/echo/echo-db/src/parties/party-manager.ts#L44)

___

### update

• `Readonly` **update**: `Event`<[`DataParty`](DataParty.md)\>

#### Defined in

[packages/echo/echo-db/src/parties/party-manager.ts:41](https://github.com/dxos/dxos/blob/6b1348fed/packages/echo/echo-db/src/parties/party-manager.ts#L41)

## Accessors

### isOpen

• `get` **isOpen**(): `boolean`

#### Returns

`boolean`

#### Defined in

[packages/echo/echo-db/src/parties/party-manager.ts:55](https://github.com/dxos/dxos/blob/6b1348fed/packages/echo/echo-db/src/parties/party-manager.ts#L55)

___

### parties

• `get` **parties**(): [`DataParty`](DataParty.md)[]

#### Returns

[`DataParty`](DataParty.md)[]

#### Defined in

[packages/echo/echo-db/src/parties/party-manager.ts:59](https://github.com/dxos/dxos/blob/6b1348fed/packages/echo/echo-db/src/parties/party-manager.ts#L59)

## Methods

### \_recordPartyJoining

▸ `Private` **_recordPartyJoining**(`party`): `Promise`<`void`\>

#### Parameters

| Name | Type |
| :------ | :------ |
| `party` | [`DataParty`](DataParty.md) |

#### Returns

`Promise`<`void`\>

#### Defined in

[packages/echo/echo-db/src/parties/party-manager.ts:322](https://github.com/dxos/dxos/blob/6b1348fed/packages/echo/echo-db/src/parties/party-manager.ts#L322)

___

### \_setParty

▸ `Private` **_setParty**(`party`): `void`

#### Parameters

| Name | Type |
| :------ | :------ |
| `party` | [`DataParty`](DataParty.md) |

#### Returns

`void`

#### Defined in

[packages/echo/echo-db/src/parties/party-manager.ts:233](https://github.com/dxos/dxos/blob/6b1348fed/packages/echo/echo-db/src/parties/party-manager.ts#L233)

___

### \_updateContactList

▸ `Private` **_updateContactList**(`party`): `Promise`<`void`\>

#### Parameters

| Name | Type |
| :------ | :------ |
| `party` | [`DataParty`](DataParty.md) |

#### Returns

`Promise`<`void`\>

#### Defined in

[packages/echo/echo-db/src/parties/party-manager.ts:282](https://github.com/dxos/dxos/blob/6b1348fed/packages/echo/echo-db/src/parties/party-manager.ts#L282)

___

### \_updatePartyTitle

▸ `Private` **_updatePartyTitle**(`party`): `Promise`<`void`\>

#### Parameters

| Name | Type |
| :------ | :------ |
| `party` | [`DataParty`](DataParty.md) |

#### Returns

`Promise`<`void`\>

#### Defined in

[packages/echo/echo-db/src/parties/party-manager.ts:267](https://github.com/dxos/dxos/blob/6b1348fed/packages/echo/echo-db/src/parties/party-manager.ts#L267)

___

### addParty

▸ **addParty**(`partyKey`, `genesisFeedKey`): `Promise`<`undefined` \| [`DataParty`](DataParty.md)\>

Construct a party object and start replicating with the remote peer that created that party.

#### Parameters

| Name | Type |
| :------ | :------ |
| `partyKey` | `PublicKey` |
| `genesisFeedKey` | `PublicKey` |

#### Returns

`Promise`<`undefined` \| [`DataParty`](DataParty.md)\>

#### Defined in

[packages/echo/echo-db/src/parties/party-manager.ts:163](https://github.com/dxos/dxos/blob/6b1348fed/packages/echo/echo-db/src/parties/party-manager.ts#L163)

___

### cloneParty

▸ **cloneParty**(`snapshot`): `Promise`<[`DataParty`](DataParty.md)\>

#### Parameters

| Name | Type |
| :------ | :------ |
| `snapshot` | `PartySnapshot` |

#### Returns

`Promise`<[`DataParty`](DataParty.md)\>

#### Defined in

[packages/echo/echo-db/src/parties/party-manager.ts:211](https://github.com/dxos/dxos/blob/6b1348fed/packages/echo/echo-db/src/parties/party-manager.ts#L211)

___

### close

▸ **close**(): `Promise`<`void`\>

#### Returns

`Promise`<`void`\>

#### Defined in

[packages/echo/echo-db/src/parties/party-manager.ts:120](https://github.com/dxos/dxos/blob/6b1348fed/packages/echo/echo-db/src/parties/party-manager.ts#L120)

___

### createParty

▸ **createParty**(): `Promise`<[`DataParty`](DataParty.md)\>

Creates a new party, writing its genesis block to the stream.

#### Returns

`Promise`<[`DataParty`](DataParty.md)\>

#### Defined in

[packages/echo/echo-db/src/parties/party-manager.ts:146](https://github.com/dxos/dxos/blob/6b1348fed/packages/echo/echo-db/src/parties/party-manager.ts#L146)

___

### joinParty

▸ **joinParty**(`invitationDescriptor`, `secretProvider`): `Promise`<[`DataParty`](DataParty.md)\>

#### Parameters

| Name | Type |
| :------ | :------ |
| `invitationDescriptor` | [`InvitationDescriptor`](InvitationDescriptor.md) |
| `secretProvider` | `SecretProvider` |

#### Returns

`Promise`<[`DataParty`](DataParty.md)\>

#### Defined in

[packages/echo/echo-db/src/parties/party-manager.ts:189](https://github.com/dxos/dxos/blob/6b1348fed/packages/echo/echo-db/src/parties/party-manager.ts#L189)

___

### open

▸ **open**(`onProgressCallback?`): `Promise`<`void`\>

#### Parameters

| Name | Type |
| :------ | :------ |
| `onProgressCallback?` | (`progress`: [`OpenProgress`](../interfaces/OpenProgress.md)) => `void` |

#### Returns

`Promise`<`void`\>

#### Defined in

[packages/echo/echo-db/src/parties/party-manager.ts:63](https://github.com/dxos/dxos/blob/6b1348fed/packages/echo/echo-db/src/parties/party-manager.ts#L63)
