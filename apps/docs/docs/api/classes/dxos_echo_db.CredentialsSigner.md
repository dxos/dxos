---
id: "dxos_echo_db.CredentialsSigner"
title: "Class: CredentialsSigner"
sidebar_label: "CredentialsSigner"
custom_edit_url: null
---

[@dxos/echo-db](../modules/dxos_echo_db.md).CredentialsSigner

Contains a signer (keyring), provides signing keys to create signed credential messages.

## Constructors

### constructor

• **new CredentialsSigner**(`_signer`, `_identityKey`, `_deviceKey`, `_signingKeys`)

#### Parameters

| Name | Type |
| :------ | :------ |
| `_signer` | `Signer` |
| `_identityKey` | `KeyRecord` |
| `_deviceKey` | `KeyRecord` |
| `_signingKeys` | `KeyRecord` \| `KeyChain` |

#### Defined in

[packages/echo/echo-db/src/protocol/credentials-signer.ts:28](https://github.com/dxos/protocols/blob/6f4c34af3/packages/echo/echo-db/src/protocol/credentials-signer.ts#L28)

## Accessors

### signer

• `get` **signer**(): `Signer`

#### Returns

`Signer`

#### Defined in

[packages/echo/echo-db/src/protocol/credentials-signer.ts:35](https://github.com/dxos/protocols/blob/6f4c34af3/packages/echo/echo-db/src/protocol/credentials-signer.ts#L35)

## Methods

### getDeviceKey

▸ **getDeviceKey**(): `KeyRecord`

#### Returns

`KeyRecord`

#### Defined in

[packages/echo/echo-db/src/protocol/credentials-signer.ts:43](https://github.com/dxos/protocols/blob/6f4c34af3/packages/echo/echo-db/src/protocol/credentials-signer.ts#L43)

___

### getDeviceSigningKeys

▸ **getDeviceSigningKeys**(): `KeyRecord` \| `KeyChain`

#### Returns

`KeyRecord` \| `KeyChain`

Either a device key record or a key-chain for the device key.

HALO-party members are devices of the same profile,
and their admission credential messages are stored in the same HALO party
so they can sign directly with their DEVICE key.

Data-parties don't store credentials that admit devices to profiles.
Devices need to sign with their keyChain including the device key admission credential in the signature.

#### Defined in

[packages/echo/echo-db/src/protocol/credentials-signer.ts:57](https://github.com/dxos/protocols/blob/6f4c34af3/packages/echo/echo-db/src/protocol/credentials-signer.ts#L57)

___

### getIdentityKey

▸ **getIdentityKey**(): `KeyRecord`

#### Returns

`KeyRecord`

#### Defined in

[packages/echo/echo-db/src/protocol/credentials-signer.ts:39](https://github.com/dxos/protocols/blob/6f4c34af3/packages/echo/echo-db/src/protocol/credentials-signer.ts#L39)

___

### createDirectDeviceSigner

▸ `Static` **createDirectDeviceSigner**(`keyring`): [`CredentialsSigner`](dxos_echo_db.CredentialsSigner.md)

Queries IDENTITY and DEVICE keys from the keyring.
Uses the device key without keychain for signing.

#### Parameters

| Name | Type |
| :------ | :------ |
| `keyring` | `Keyring` |

#### Returns

[`CredentialsSigner`](dxos_echo_db.CredentialsSigner.md)

#### Defined in

[packages/echo/echo-db/src/protocol/credentials-signer.ts:16](https://github.com/dxos/protocols/blob/6f4c34af3/packages/echo/echo-db/src/protocol/credentials-signer.ts#L16)
