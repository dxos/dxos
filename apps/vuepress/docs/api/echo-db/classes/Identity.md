# Class: Identity

Represents users identity exposing access to signing keys and HALO party.

Acts as a read-only view into IdentityManager.

## Implements

- `IdentityCredentials`

## Table of contents

### Constructors

- [constructor](Identity.md#constructor)

### Properties

- [\_deviceKey](Identity.md#_devicekey)
- [\_deviceKeyChain](Identity.md#_devicekeychain)
- [\_identityKey](Identity.md#_identitykey)

### Accessors

- [contacts](Identity.md#contacts)
- [deviceKey](Identity.md#devicekey)
- [deviceKeyChain](Identity.md#devicekeychain)
- [displayName](Identity.md#displayname)
- [halo](Identity.md#halo)
- [identityGenesis](Identity.md#identitygenesis)
- [identityInfo](Identity.md#identityinfo)
- [identityKey](Identity.md#identitykey)
- [keyring](Identity.md#keyring)
- [preferences](Identity.md#preferences)
- [signer](Identity.md#signer)

### Methods

- [createCredentialsSigner](Identity.md#createcredentialssigner)

## Constructors

### constructor

• **new Identity**(`_keyring`, `_halo`)

#### Parameters

| Name | Type | Description |
| :------ | :------ | :------ |
| `_keyring` | `Keyring` |  |
| `_halo` | [`HaloParty`](HaloParty.md) | HALO party. Must be open. |

#### Defined in

[packages/echo/echo-db/src/halo/identity.ts:35](https://github.com/dxos/dxos/blob/6b1348fed/packages/echo/echo-db/src/halo/identity.ts#L35)

## Properties

### \_deviceKey

• `Private` `Readonly` **\_deviceKey**: `KeyRecord`

#### Defined in

[packages/echo/echo-db/src/halo/identity.ts:28](https://github.com/dxos/dxos/blob/6b1348fed/packages/echo/echo-db/src/halo/identity.ts#L28)

___

### \_deviceKeyChain

• `Private` `Readonly` **\_deviceKeyChain**: `KeyChain`

#### Defined in

[packages/echo/echo-db/src/halo/identity.ts:29](https://github.com/dxos/dxos/blob/6b1348fed/packages/echo/echo-db/src/halo/identity.ts#L29)

___

### \_identityKey

• `Private` `Readonly` **\_identityKey**: `KeyRecord`

#### Defined in

[packages/echo/echo-db/src/halo/identity.ts:27](https://github.com/dxos/dxos/blob/6b1348fed/packages/echo/echo-db/src/halo/identity.ts#L27)

## Accessors

### contacts

• `get` **contacts**(): [`ContactManager`](ContactManager.md)

#### Returns

[`ContactManager`](ContactManager.md)

#### Implementation of

IdentityCredentials.contacts

#### Defined in

[packages/echo/echo-db/src/halo/identity.ts:85](https://github.com/dxos/dxos/blob/6b1348fed/packages/echo/echo-db/src/halo/identity.ts#L85)

___

### deviceKey

• `get` **deviceKey**(): `KeyRecord`

#### Returns

`KeyRecord`

#### Implementation of

IdentityCredentials.deviceKey

#### Defined in

[packages/echo/echo-db/src/halo/identity.ts:57](https://github.com/dxos/dxos/blob/6b1348fed/packages/echo/echo-db/src/halo/identity.ts#L57)

___

### deviceKeyChain

• `get` **deviceKeyChain**(): `KeyChain`

#### Returns

`KeyChain`

#### Implementation of

IdentityCredentials.deviceKeyChain

#### Defined in

[packages/echo/echo-db/src/halo/identity.ts:61](https://github.com/dxos/dxos/blob/6b1348fed/packages/echo/echo-db/src/halo/identity.ts#L61)

___

### displayName

• `get` **displayName**(): `undefined` \| `string`

#### Returns

`undefined` \| `string`

#### Implementation of

IdentityCredentials.displayName

#### Defined in

[packages/echo/echo-db/src/halo/identity.ts:65](https://github.com/dxos/dxos/blob/6b1348fed/packages/echo/echo-db/src/halo/identity.ts#L65)

___

### halo

• `get` **halo**(): [`HaloParty`](HaloParty.md)

HALO party. Must be open.

#### Returns

[`HaloParty`](HaloParty.md)

#### Defined in

[packages/echo/echo-db/src/halo/identity.ts:93](https://github.com/dxos/dxos/blob/6b1348fed/packages/echo/echo-db/src/halo/identity.ts#L93)

___

### identityGenesis

• `get` **identityGenesis**(): `SignedMessage`

#### Returns

`SignedMessage`

#### Implementation of

IdentityCredentials.identityGenesis

#### Defined in

[packages/echo/echo-db/src/halo/identity.ts:77](https://github.com/dxos/dxos/blob/6b1348fed/packages/echo/echo-db/src/halo/identity.ts#L77)

___

### identityInfo

• `get` **identityInfo**(): `undefined` \| `SignedMessage`

Contains profile username.
Can be missing if the username wasn't provided when profile was created.

#### Returns

`undefined` \| `SignedMessage`

#### Implementation of

IdentityCredentials.identityInfo

#### Defined in

[packages/echo/echo-db/src/halo/identity.ts:73](https://github.com/dxos/dxos/blob/6b1348fed/packages/echo/echo-db/src/halo/identity.ts#L73)

___

### identityKey

• `get` **identityKey**(): `KeyRecord`

#### Returns

`KeyRecord`

#### Implementation of

IdentityCredentials.identityKey

#### Defined in

[packages/echo/echo-db/src/halo/identity.ts:53](https://github.com/dxos/dxos/blob/6b1348fed/packages/echo/echo-db/src/halo/identity.ts#L53)

___

### keyring

• `get` **keyring**(): `Keyring`

#### Returns

`Keyring`

#### Implementation of

IdentityCredentials.keyring

#### Defined in

[packages/echo/echo-db/src/halo/identity.ts:49](https://github.com/dxos/dxos/blob/6b1348fed/packages/echo/echo-db/src/halo/identity.ts#L49)

___

### preferences

• `get` **preferences**(): [`Preferences`](Preferences.md)

#### Returns

[`Preferences`](Preferences.md)

#### Implementation of

IdentityCredentials.preferences

#### Defined in

[packages/echo/echo-db/src/halo/identity.ts:81](https://github.com/dxos/dxos/blob/6b1348fed/packages/echo/echo-db/src/halo/identity.ts#L81)

___

### signer

• `get` **signer**(): `Signer`

#### Returns

`Signer`

#### Defined in

[packages/echo/echo-db/src/halo/identity.ts:45](https://github.com/dxos/dxos/blob/6b1348fed/packages/echo/echo-db/src/halo/identity.ts#L45)

## Methods

### createCredentialsSigner

▸ **createCredentialsSigner**(): [`CredentialsSigner`](CredentialsSigner.md)

#### Returns

[`CredentialsSigner`](CredentialsSigner.md)

#### Implementation of

IdentityCredentials.createCredentialsSigner

#### Defined in

[packages/echo/echo-db/src/halo/identity.ts:97](https://github.com/dxos/dxos/blob/6b1348fed/packages/echo/echo-db/src/halo/identity.ts#L97)
