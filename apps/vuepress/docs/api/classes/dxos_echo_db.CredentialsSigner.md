# Class: CredentialsSigner

[@dxos/echo-db](../modules/dxos_echo_db.md).CredentialsSigner

Contains a signer (keyring), provides signing keys to create signed credential messages.

## Table of contents

### Constructors

- [constructor](dxos_echo_db.CredentialsSigner.md#constructor)

### Accessors

- [signer](dxos_echo_db.CredentialsSigner.md#signer)

### Methods

- [getDeviceKey](dxos_echo_db.CredentialsSigner.md#getdevicekey)
- [getDeviceSigningKeys](dxos_echo_db.CredentialsSigner.md#getdevicesigningkeys)
- [getIdentityKey](dxos_echo_db.CredentialsSigner.md#getidentitykey)
- [createDirectDeviceSigner](dxos_echo_db.CredentialsSigner.md#createdirectdevicesigner)

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

[packages/echo/echo-db/src/protocol/credentials-signer.ts:29](https://github.com/dxos/dxos/blob/32ae9b579/packages/echo/echo-db/src/protocol/credentials-signer.ts#L29)

## Accessors

### signer

• `get` **signer**(): `Signer`

#### Returns

`Signer`

#### Defined in

[packages/echo/echo-db/src/protocol/credentials-signer.ts:36](https://github.com/dxos/dxos/blob/32ae9b579/packages/echo/echo-db/src/protocol/credentials-signer.ts#L36)

## Methods

### getDeviceKey

▸ **getDeviceKey**(): `KeyRecord`

#### Returns

`KeyRecord`

#### Defined in

[packages/echo/echo-db/src/protocol/credentials-signer.ts:44](https://github.com/dxos/dxos/blob/32ae9b579/packages/echo/echo-db/src/protocol/credentials-signer.ts#L44)

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

[packages/echo/echo-db/src/protocol/credentials-signer.ts:58](https://github.com/dxos/dxos/blob/32ae9b579/packages/echo/echo-db/src/protocol/credentials-signer.ts#L58)

___

### getIdentityKey

▸ **getIdentityKey**(): `KeyRecord`

#### Returns

`KeyRecord`

#### Defined in

[packages/echo/echo-db/src/protocol/credentials-signer.ts:40](https://github.com/dxos/dxos/blob/32ae9b579/packages/echo/echo-db/src/protocol/credentials-signer.ts#L40)

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

[packages/echo/echo-db/src/protocol/credentials-signer.ts:17](https://github.com/dxos/dxos/blob/32ae9b579/packages/echo/echo-db/src/protocol/credentials-signer.ts#L17)
