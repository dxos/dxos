---
id: "dxos_echo_db.HALO"
title: "Class: HALO"
sidebar_label: "HALO"
custom_edit_url: null
---

[@dxos/echo-db](../modules/dxos_echo_db.md).HALO

Manages user's identity and devices.

## Constructors

### constructor

• **new HALO**(`__namedParameters`)

#### Parameters

| Name | Type |
| :------ | :------ |
| `__namedParameters` | [`HaloConfiguration`](../interfaces/dxos_echo_db.HaloConfiguration.md) |

#### Defined in

[packages/echo/echo-db/src/halo/halo.ts:53](https://github.com/dxos/protocols/blob/6f4c34af3/packages/echo/echo-db/src/halo/halo.ts#L53)

## Properties

### \_identityManager

• `Private` `Readonly` **\_identityManager**: [`IdentityManager`](dxos_echo_db.IdentityManager.md)

#### Defined in

[packages/echo/echo-db/src/halo/halo.ts:49](https://github.com/dxos/protocols/blob/6f4c34af3/packages/echo/echo-db/src/halo/halo.ts#L49)

___

### \_isOpen

• `Private` **\_isOpen**: `boolean` = `false`

#### Defined in

[packages/echo/echo-db/src/halo/halo.ts:51](https://github.com/dxos/protocols/blob/6f4c34af3/packages/echo/echo-db/src/halo/halo.ts#L51)

___

### \_keyring

• `Private` `Readonly` **\_keyring**: `Keyring`

#### Defined in

[packages/echo/echo-db/src/halo/halo.ts:48](https://github.com/dxos/protocols/blob/6f4c34af3/packages/echo/echo-db/src/halo/halo.ts#L48)

## Accessors

### identity

• `get` **identity**(): `undefined` \| [`Identity`](dxos_echo_db.Identity.md)

Get user's identity.

#### Returns

`undefined` \| [`Identity`](dxos_echo_db.Identity.md)

#### Defined in

[packages/echo/echo-db/src/halo/halo.ts:98](https://github.com/dxos/protocols/blob/6f4c34af3/packages/echo/echo-db/src/halo/halo.ts#L98)

___

### identityDisplayName

• `get` **identityDisplayName**(): `undefined` \| `string`

User's identity display name.

#### Returns

`undefined` \| `string`

#### Defined in

[packages/echo/echo-db/src/halo/halo.ts:120](https://github.com/dxos/protocols/blob/6f4c34af3/packages/echo/echo-db/src/halo/halo.ts#L120)

___

### identityKey

• `get` **identityKey**(): `undefined` \| `KeyRecord`

User's IDENTITY keypair.

#### Returns

`undefined` \| `KeyRecord`

#### Defined in

[packages/echo/echo-db/src/halo/halo.ts:112](https://github.com/dxos/protocols/blob/6f4c34af3/packages/echo/echo-db/src/halo/halo.ts#L112)

___

### identityReady

• `get` **identityReady**(): `Event`<`void`\>

Event that is fired when the user's identity has been initialized.

#### Returns

`Event`<`void`\>

#### Defined in

[packages/echo/echo-db/src/halo/halo.ts:105](https://github.com/dxos/protocols/blob/6f4c34af3/packages/echo/echo-db/src/halo/halo.ts#L105)

___

### isInitialized

• `get` **isInitialized**(): `boolean`

Whether the current identity manager has been initialized.

#### Returns

`boolean`

#### Defined in

[packages/echo/echo-db/src/halo/halo.ts:91](https://github.com/dxos/protocols/blob/6f4c34af3/packages/echo/echo-db/src/halo/halo.ts#L91)

___

### keyring

• `get` **keyring**(): `Keyring`

Local keyring. Stores locally known keypairs.

#### Returns

`Keyring`

#### Defined in

[packages/echo/echo-db/src/halo/halo.ts:127](https://github.com/dxos/protocols/blob/6f4c34af3/packages/echo/echo-db/src/halo/halo.ts#L127)

## Methods

### \_createHaloParty

▸ `Private` **_createHaloParty**(`displayName?`): `Promise`<`void`\>

Creates the initial HALO party.

#### Parameters

| Name | Type |
| :------ | :------ |
| `displayName?` | `string` |

#### Returns

`Promise`<`void`\>

#### Defined in

[packages/echo/echo-db/src/halo/halo.ts:191](https://github.com/dxos/protocols/blob/6f4c34af3/packages/echo/echo-db/src/halo/halo.ts#L191)

___

### \_createIdentityKeypair

▸ `Private` **_createIdentityKeypair**(`keyPair`): `Promise`<`void`\>

Create Profile. Add Identity key if public and secret key are provided.

NOTE: This method does not initialize the HALO party.

#### Parameters

| Name | Type |
| :------ | :------ |
| `keyPair` | `KeyPair` |

#### Returns

`Promise`<`void`\>

#### Defined in

[packages/echo/echo-db/src/halo/halo.ts:174](https://github.com/dxos/protocols/blob/6f4c34af3/packages/echo/echo-db/src/halo/halo.ts#L174)

___

### close

▸ **close**(): `Promise`<`void`\>

Closes HALO. Automatically called when client is destroyed.

#### Returns

`Promise`<`void`\>

#### Defined in

[packages/echo/echo-db/src/halo/halo.ts:152](https://github.com/dxos/protocols/blob/6f4c34af3/packages/echo/echo-db/src/halo/halo.ts#L152)

___

### createInvitation

▸ **createInvitation**(`authenticationDetails`, `options?`): `Promise`<[`InvitationDescriptor`](dxos_echo_db.InvitationDescriptor.md)\>

Create an invitation to an exiting identity HALO.

#### Parameters

| Name | Type |
| :------ | :------ |
| `authenticationDetails` | [`InvitationAuthenticator`](../interfaces/dxos_echo_db.InvitationAuthenticator.md) |
| `options?` | [`InvitationOptions`](../interfaces/dxos_echo_db.InvitationOptions.md) |

#### Returns

`Promise`<[`InvitationDescriptor`](dxos_echo_db.InvitationDescriptor.md)\>

#### Defined in

[packages/echo/echo-db/src/halo/halo.ts:227](https://github.com/dxos/protocols/blob/6f4c34af3/packages/echo/echo-db/src/halo/halo.ts#L227)

___

### createProfile

▸ **createProfile**(`__namedParameters?`): `Promise`<[`ProfileInfo`](../interfaces/dxos_echo_db.ProfileInfo.md)\>

Create Profile. Add Identity key if public and secret key are provided. Then initializes profile with given username.
If not public and secret key are provided it relies on keyring to contain an identity key.

#### Parameters

| Name | Type |
| :------ | :------ |
| `__namedParameters` | [`CreateProfileOptions`](../interfaces/dxos_echo_db.CreateProfileOptions.md) |

#### Returns

`Promise`<[`ProfileInfo`](../interfaces/dxos_echo_db.ProfileInfo.md)\>

User profile info.

#### Defined in

[packages/echo/echo-db/src/halo/halo.ts:249](https://github.com/dxos/protocols/blob/6f4c34af3/packages/echo/echo-db/src/halo/halo.ts#L249)

___

### getProfile

▸ **getProfile**(): `undefined` \| [`ProfileInfo`](../interfaces/dxos_echo_db.ProfileInfo.md)

#### Returns

`undefined` \| [`ProfileInfo`](../interfaces/dxos_echo_db.ProfileInfo.md)

User profile info.

#### Defined in

[packages/echo/echo-db/src/halo/halo.ts:272](https://github.com/dxos/protocols/blob/6f4c34af3/packages/echo/echo-db/src/halo/halo.ts#L272)

___

### info

▸ **info**(): `Object`

#### Returns

`Object`

| Name | Type |
| :------ | :------ |
| `displayName` | `undefined` \| `string` |
| `identityKey` | `undefined` \| `string` |
| `initialized` | `boolean` |

#### Defined in

[packages/echo/echo-db/src/halo/halo.ts:80](https://github.com/dxos/protocols/blob/6f4c34af3/packages/echo/echo-db/src/halo/halo.ts#L80)

___

### join

▸ **join**(`invitationDescriptor`, `secretProvider`): `Promise`<[`HaloParty`](dxos_echo_db.HaloParty.md)\>

Joins an existing identity HALO by invitation.

#### Parameters

| Name | Type |
| :------ | :------ |
| `invitationDescriptor` | [`InvitationDescriptor`](dxos_echo_db.InvitationDescriptor.md) |
| `secretProvider` | `SecretProvider` |

#### Returns

`Promise`<[`HaloParty`](dxos_echo_db.HaloParty.md)\>

#### Defined in

[packages/echo/echo-db/src/halo/halo.ts:218](https://github.com/dxos/protocols/blob/6f4c34af3/packages/echo/echo-db/src/halo/halo.ts#L218)

___

### queryContacts

▸ **queryContacts**(): [`ResultSet`](dxos_echo_db.ResultSet.md)<[`PartyMember`](../interfaces/dxos_echo_db.PartyMember.md)\>

Query for contacts. Contacts represent member keys across all known Parties.

#### Returns

[`ResultSet`](dxos_echo_db.ResultSet.md)<[`PartyMember`](../interfaces/dxos_echo_db.PartyMember.md)\>

#### Defined in

[packages/echo/echo-db/src/halo/halo.ts:237](https://github.com/dxos/protocols/blob/6f4c34af3/packages/echo/echo-db/src/halo/halo.ts#L237)

___

### recover

▸ **recover**(`seedPhrase`): `Promise`<[`HaloParty`](dxos_echo_db.HaloParty.md)\>

Joins an existing identity HALO from a recovery seed phrase.

#### Parameters

| Name | Type |
| :------ | :------ |
| `seedPhrase` | `string` |

#### Returns

`Promise`<[`HaloParty`](dxos_echo_db.HaloParty.md)\>

#### Defined in

[packages/echo/echo-db/src/halo/halo.ts:207](https://github.com/dxos/protocols/blob/6f4c34af3/packages/echo/echo-db/src/halo/halo.ts#L207)

___

### reset

▸ **reset**(): `Promise`<`void`\>

Reset the identity and delete all key records.

#### Returns

`Promise`<`void`\>

#### Defined in

[packages/echo/echo-db/src/halo/halo.ts:161](https://github.com/dxos/protocols/blob/6f4c34af3/packages/echo/echo-db/src/halo/halo.ts#L161)

___

### subscribeToProfile

▸ **subscribeToProfile**(`callback`): () => `void`

#### Parameters

| Name | Type |
| :------ | :------ |
| `callback` | () => `void` |

#### Returns

`fn`

▸ (): `void`

##### Returns

`void`

#### Defined in

[packages/echo/echo-db/src/halo/halo.ts:284](https://github.com/dxos/protocols/blob/6f4c34af3/packages/echo/echo-db/src/halo/halo.ts#L284)

___

### toString

▸ **toString**(): `string`

#### Returns

`string`

#### Defined in

[packages/echo/echo-db/src/halo/halo.ts:76](https://github.com/dxos/protocols/blob/6f4c34af3/packages/echo/echo-db/src/halo/halo.ts#L76)
