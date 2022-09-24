# Class: HALO

Manages user's identity and devices.

## Table of contents

### Constructors

- [constructor](HALO.md#constructor)

### Properties

- [\_identityManager](HALO.md#_identitymanager)
- [\_isOpen](HALO.md#_isopen)
- [\_keyring](HALO.md#_keyring)

### Accessors

- [identity](HALO.md#identity)
- [identityDisplayName](HALO.md#identitydisplayname)
- [identityKey](HALO.md#identitykey)
- [identityReady](HALO.md#identityready)
- [isInitialized](HALO.md#isinitialized)
- [keyring](HALO.md#keyring)

### Methods

- [\_createHaloParty](HALO.md#_createhaloparty)
- [\_createIdentityKeypair](HALO.md#_createidentitykeypair)
- [close](HALO.md#close)
- [createInvitation](HALO.md#createinvitation)
- [createProfile](HALO.md#createprofile)
- [getProfile](HALO.md#getprofile)
- [info](HALO.md#info)
- [join](HALO.md#join)
- [queryContacts](HALO.md#querycontacts)
- [recover](HALO.md#recover)
- [reset](HALO.md#reset)
- [subscribeToProfile](HALO.md#subscribetoprofile)
- [toString](HALO.md#tostring)

## Constructors

### constructor

• **new HALO**(`__namedParameters`)

#### Parameters

| Name | Type |
| :------ | :------ |
| `__namedParameters` | [`HaloConfiguration`](../interfaces/HaloConfiguration.md) |

#### Defined in

[packages/echo/echo-db/src/halo/halo.ts:54](https://github.com/dxos/dxos/blob/6b1348fed/packages/echo/echo-db/src/halo/halo.ts#L54)

## Properties

### \_identityManager

• `Private` `Readonly` **\_identityManager**: [`IdentityManager`](IdentityManager.md)

#### Defined in

[packages/echo/echo-db/src/halo/halo.ts:50](https://github.com/dxos/dxos/blob/6b1348fed/packages/echo/echo-db/src/halo/halo.ts#L50)

___

### \_isOpen

• `Private` **\_isOpen**: `boolean` = `false`

#### Defined in

[packages/echo/echo-db/src/halo/halo.ts:52](https://github.com/dxos/dxos/blob/6b1348fed/packages/echo/echo-db/src/halo/halo.ts#L52)

___

### \_keyring

• `Private` `Readonly` **\_keyring**: `Keyring`

#### Defined in

[packages/echo/echo-db/src/halo/halo.ts:49](https://github.com/dxos/dxos/blob/6b1348fed/packages/echo/echo-db/src/halo/halo.ts#L49)

## Accessors

### identity

• `get` **identity**(): `undefined` \| [`Identity`](Identity.md)

Get user's identity.

#### Returns

`undefined` \| [`Identity`](Identity.md)

#### Defined in

[packages/echo/echo-db/src/halo/halo.ts:99](https://github.com/dxos/dxos/blob/6b1348fed/packages/echo/echo-db/src/halo/halo.ts#L99)

___

### identityDisplayName

• `get` **identityDisplayName**(): `undefined` \| `string`

User's identity display name.

#### Returns

`undefined` \| `string`

#### Defined in

[packages/echo/echo-db/src/halo/halo.ts:121](https://github.com/dxos/dxos/blob/6b1348fed/packages/echo/echo-db/src/halo/halo.ts#L121)

___

### identityKey

• `get` **identityKey**(): `undefined` \| `KeyRecord`

User's IDENTITY keypair.

#### Returns

`undefined` \| `KeyRecord`

#### Defined in

[packages/echo/echo-db/src/halo/halo.ts:113](https://github.com/dxos/dxos/blob/6b1348fed/packages/echo/echo-db/src/halo/halo.ts#L113)

___

### identityReady

• `get` **identityReady**(): `Event`<`void`\>

Event that is fired when the user's identity has been initialized.

#### Returns

`Event`<`void`\>

#### Defined in

[packages/echo/echo-db/src/halo/halo.ts:106](https://github.com/dxos/dxos/blob/6b1348fed/packages/echo/echo-db/src/halo/halo.ts#L106)

___

### isInitialized

• `get` **isInitialized**(): `boolean`

Whether the current identity manager has been initialized.

#### Returns

`boolean`

#### Defined in

[packages/echo/echo-db/src/halo/halo.ts:92](https://github.com/dxos/dxos/blob/6b1348fed/packages/echo/echo-db/src/halo/halo.ts#L92)

___

### keyring

• `get` **keyring**(): `Keyring`

Local keyring. Stores locally known keypairs.

#### Returns

`Keyring`

#### Defined in

[packages/echo/echo-db/src/halo/halo.ts:128](https://github.com/dxos/dxos/blob/6b1348fed/packages/echo/echo-db/src/halo/halo.ts#L128)

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

[packages/echo/echo-db/src/halo/halo.ts:192](https://github.com/dxos/dxos/blob/6b1348fed/packages/echo/echo-db/src/halo/halo.ts#L192)

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

[packages/echo/echo-db/src/halo/halo.ts:175](https://github.com/dxos/dxos/blob/6b1348fed/packages/echo/echo-db/src/halo/halo.ts#L175)

___

### close

▸ **close**(): `Promise`<`void`\>

Closes HALO. Automatically called when client is destroyed.

#### Returns

`Promise`<`void`\>

#### Defined in

[packages/echo/echo-db/src/halo/halo.ts:153](https://github.com/dxos/dxos/blob/6b1348fed/packages/echo/echo-db/src/halo/halo.ts#L153)

___

### createInvitation

▸ **createInvitation**(`authenticationDetails`, `options?`): `Promise`<[`InvitationDescriptor`](InvitationDescriptor.md)\>

Create an invitation to an exiting identity HALO.

#### Parameters

| Name | Type |
| :------ | :------ |
| `authenticationDetails` | [`InvitationAuthenticator`](../interfaces/InvitationAuthenticator.md) |
| `options?` | [`InvitationOptions`](../interfaces/InvitationOptions.md) |

#### Returns

`Promise`<[`InvitationDescriptor`](InvitationDescriptor.md)\>

#### Defined in

[packages/echo/echo-db/src/halo/halo.ts:228](https://github.com/dxos/dxos/blob/6b1348fed/packages/echo/echo-db/src/halo/halo.ts#L228)

___

### createProfile

▸ **createProfile**(`__namedParameters?`): `Promise`<[`ProfileInfo`](../interfaces/ProfileInfo.md)\>

Create Profile. Add Identity key if public and secret key are provided. Then initializes profile with given username.
If not public and secret key are provided it relies on keyring to contain an identity key.

#### Parameters

| Name | Type |
| :------ | :------ |
| `__namedParameters` | [`CreateProfileOptions`](../interfaces/CreateProfileOptions.md) |

#### Returns

`Promise`<[`ProfileInfo`](../interfaces/ProfileInfo.md)\>

User profile info.

#### Defined in

[packages/echo/echo-db/src/halo/halo.ts:250](https://github.com/dxos/dxos/blob/6b1348fed/packages/echo/echo-db/src/halo/halo.ts#L250)

___

### getProfile

▸ **getProfile**(): `undefined` \| [`ProfileInfo`](../interfaces/ProfileInfo.md)

#### Returns

`undefined` \| [`ProfileInfo`](../interfaces/ProfileInfo.md)

User profile info.

#### Defined in

[packages/echo/echo-db/src/halo/halo.ts:273](https://github.com/dxos/dxos/blob/6b1348fed/packages/echo/echo-db/src/halo/halo.ts#L273)

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

[packages/echo/echo-db/src/halo/halo.ts:81](https://github.com/dxos/dxos/blob/6b1348fed/packages/echo/echo-db/src/halo/halo.ts#L81)

___

### join

▸ **join**(`invitationDescriptor`, `secretProvider`): `Promise`<[`HaloParty`](HaloParty.md)\>

Joins an existing identity HALO by invitation.

#### Parameters

| Name | Type |
| :------ | :------ |
| `invitationDescriptor` | [`InvitationDescriptor`](InvitationDescriptor.md) |
| `secretProvider` | `SecretProvider` |

#### Returns

`Promise`<[`HaloParty`](HaloParty.md)\>

#### Defined in

[packages/echo/echo-db/src/halo/halo.ts:219](https://github.com/dxos/dxos/blob/6b1348fed/packages/echo/echo-db/src/halo/halo.ts#L219)

___

### queryContacts

▸ **queryContacts**(): [`ResultSet`](ResultSet.md)<[`PartyMember`](../interfaces/PartyMember.md)\>

Query for contacts. Contacts represent member keys across all known Parties.

#### Returns

[`ResultSet`](ResultSet.md)<[`PartyMember`](../interfaces/PartyMember.md)\>

#### Defined in

[packages/echo/echo-db/src/halo/halo.ts:238](https://github.com/dxos/dxos/blob/6b1348fed/packages/echo/echo-db/src/halo/halo.ts#L238)

___

### recover

▸ **recover**(`seedPhrase`): `Promise`<[`HaloParty`](HaloParty.md)\>

Joins an existing identity HALO from a recovery seed phrase.

#### Parameters

| Name | Type |
| :------ | :------ |
| `seedPhrase` | `string` |

#### Returns

`Promise`<[`HaloParty`](HaloParty.md)\>

#### Defined in

[packages/echo/echo-db/src/halo/halo.ts:208](https://github.com/dxos/dxos/blob/6b1348fed/packages/echo/echo-db/src/halo/halo.ts#L208)

___

### reset

▸ **reset**(): `Promise`<`void`\>

Reset the identity and delete all key records.

#### Returns

`Promise`<`void`\>

#### Defined in

[packages/echo/echo-db/src/halo/halo.ts:162](https://github.com/dxos/dxos/blob/6b1348fed/packages/echo/echo-db/src/halo/halo.ts#L162)

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

[packages/echo/echo-db/src/halo/halo.ts:285](https://github.com/dxos/dxos/blob/6b1348fed/packages/echo/echo-db/src/halo/halo.ts#L285)

___

### toString

▸ **toString**(): `string`

#### Returns

`string`

#### Defined in

[packages/echo/echo-db/src/halo/halo.ts:77](https://github.com/dxos/dxos/blob/6b1348fed/packages/echo/echo-db/src/halo/halo.ts#L77)
