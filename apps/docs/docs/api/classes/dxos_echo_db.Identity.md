---
id: "dxos_echo_db.Identity"
title: "Class: Identity"
sidebar_label: "Identity"
custom_edit_url: null
---

[@dxos/echo-db](../modules/dxos_echo_db.md).Identity

Represents users identity exposing access to signing keys and HALO party.

Acts as a read-only view into IdentityManager.

## Implements

- `IdentityCredentials`

## Constructors

### constructor

• **new Identity**(`_keyring`, `_halo`)

#### Parameters

| Name | Type | Description |
| :------ | :------ | :------ |
| `_keyring` | `Keyring` |  |
| `_halo` | [`HaloParty`](dxos_echo_db.HaloParty.md) | HALO party. Must be open. |

#### Defined in

[packages/echo/echo-db/src/halo/identity.ts:33](https://github.com/dxos/protocols/blob/6f4c34af3/packages/echo/echo-db/src/halo/identity.ts#L33)

## Properties

### \_deviceKey

• `Private` `Readonly` **\_deviceKey**: `KeyRecord`

#### Defined in

[packages/echo/echo-db/src/halo/identity.ts:26](https://github.com/dxos/protocols/blob/6f4c34af3/packages/echo/echo-db/src/halo/identity.ts#L26)

___

### \_deviceKeyChain

• `Private` `Readonly` **\_deviceKeyChain**: `KeyChain`

#### Defined in

[packages/echo/echo-db/src/halo/identity.ts:27](https://github.com/dxos/protocols/blob/6f4c34af3/packages/echo/echo-db/src/halo/identity.ts#L27)

___

### \_identityKey

• `Private` `Readonly` **\_identityKey**: `KeyRecord`

#### Defined in

[packages/echo/echo-db/src/halo/identity.ts:25](https://github.com/dxos/protocols/blob/6f4c34af3/packages/echo/echo-db/src/halo/identity.ts#L25)

## Accessors

### contacts

• `get` **contacts**(): [`ContactManager`](dxos_echo_db.ContactManager.md)

#### Returns

[`ContactManager`](dxos_echo_db.ContactManager.md)

#### Implementation of

IdentityCredentials.contacts

#### Defined in

[packages/echo/echo-db/src/halo/identity.ts:83](https://github.com/dxos/protocols/blob/6f4c34af3/packages/echo/echo-db/src/halo/identity.ts#L83)

___

### deviceKey

• `get` **deviceKey**(): `KeyRecord`

#### Returns

`KeyRecord`

#### Implementation of

IdentityCredentials.deviceKey

#### Defined in

[packages/echo/echo-db/src/halo/identity.ts:55](https://github.com/dxos/protocols/blob/6f4c34af3/packages/echo/echo-db/src/halo/identity.ts#L55)

___

### deviceKeyChain

• `get` **deviceKeyChain**(): `KeyChain`

#### Returns

`KeyChain`

#### Implementation of

IdentityCredentials.deviceKeyChain

#### Defined in

[packages/echo/echo-db/src/halo/identity.ts:59](https://github.com/dxos/protocols/blob/6f4c34af3/packages/echo/echo-db/src/halo/identity.ts#L59)

___

### displayName

• `get` **displayName**(): `undefined` \| `string`

#### Returns

`undefined` \| `string`

#### Implementation of

IdentityCredentials.displayName

#### Defined in

[packages/echo/echo-db/src/halo/identity.ts:63](https://github.com/dxos/protocols/blob/6f4c34af3/packages/echo/echo-db/src/halo/identity.ts#L63)

___

### halo

• `get` **halo**(): [`HaloParty`](dxos_echo_db.HaloParty.md)

HALO party. Must be open.

#### Returns

[`HaloParty`](dxos_echo_db.HaloParty.md)

#### Defined in

[packages/echo/echo-db/src/halo/identity.ts:91](https://github.com/dxos/protocols/blob/6f4c34af3/packages/echo/echo-db/src/halo/identity.ts#L91)

___

### identityGenesis

• `get` **identityGenesis**(): `SignedMessage`

#### Returns

`SignedMessage`

#### Implementation of

IdentityCredentials.identityGenesis

#### Defined in

[packages/echo/echo-db/src/halo/identity.ts:75](https://github.com/dxos/protocols/blob/6f4c34af3/packages/echo/echo-db/src/halo/identity.ts#L75)

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

[packages/echo/echo-db/src/halo/identity.ts:71](https://github.com/dxos/protocols/blob/6f4c34af3/packages/echo/echo-db/src/halo/identity.ts#L71)

___

### identityKey

• `get` **identityKey**(): `KeyRecord`

#### Returns

`KeyRecord`

#### Implementation of

IdentityCredentials.identityKey

#### Defined in

[packages/echo/echo-db/src/halo/identity.ts:51](https://github.com/dxos/protocols/blob/6f4c34af3/packages/echo/echo-db/src/halo/identity.ts#L51)

___

### keyring

• `get` **keyring**(): `Keyring`

#### Returns

`Keyring`

#### Implementation of

IdentityCredentials.keyring

#### Defined in

[packages/echo/echo-db/src/halo/identity.ts:47](https://github.com/dxos/protocols/blob/6f4c34af3/packages/echo/echo-db/src/halo/identity.ts#L47)

___

### preferences

• `get` **preferences**(): [`Preferences`](dxos_echo_db.Preferences.md)

#### Returns

[`Preferences`](dxos_echo_db.Preferences.md)

#### Implementation of

IdentityCredentials.preferences

#### Defined in

[packages/echo/echo-db/src/halo/identity.ts:79](https://github.com/dxos/protocols/blob/6f4c34af3/packages/echo/echo-db/src/halo/identity.ts#L79)

___

### signer

• `get` **signer**(): `Signer`

#### Returns

`Signer`

#### Defined in

[packages/echo/echo-db/src/halo/identity.ts:43](https://github.com/dxos/protocols/blob/6f4c34af3/packages/echo/echo-db/src/halo/identity.ts#L43)

## Methods

### createCredentialsSigner

▸ **createCredentialsSigner**(): [`CredentialsSigner`](dxos_echo_db.CredentialsSigner.md)

#### Returns

[`CredentialsSigner`](dxos_echo_db.CredentialsSigner.md)

#### Implementation of

IdentityCredentials.createCredentialsSigner

#### Defined in

[packages/echo/echo-db/src/halo/identity.ts:95](https://github.com/dxos/protocols/blob/6f4c34af3/packages/echo/echo-db/src/halo/identity.ts#L95)
