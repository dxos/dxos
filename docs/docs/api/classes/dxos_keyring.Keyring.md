# Class: Keyring

[@dxos/keyring](../modules/dxos_keyring.md).Keyring

Manages keys.

## Implements

- `Signer`

## Constructors

### constructor

**new Keyring**(`_storage?`)

#### Parameters

| Name | Type |
| :------ | :------ |
| `_storage` | `Directory` |

#### Defined in

[packages/core/halo/keyring/src/keyring.ts:22](https://github.com/dxos/dxos/blob/main/packages/core/halo/keyring/src/keyring.ts#L22)

## Properties

### \_keyCache

 `Private` `Readonly` **\_keyCache**: `ComplexMap`<`PublicKey`, `CryptoKeyPair`\>

#### Defined in

[packages/core/halo/keyring/src/keyring.ts:20](https://github.com/dxos/dxos/blob/main/packages/core/halo/keyring/src/keyring.ts#L20)

## Methods

### \_getKey

`Private` **_getKey**(`key`): `Promise`<`CryptoKeyPair`\>

#### Parameters

| Name | Type |
| :------ | :------ |
| `key` | `PublicKey` |

#### Returns

`Promise`<`CryptoKeyPair`\>

#### Defined in

[packages/core/halo/keyring/src/keyring.ts:46](https://github.com/dxos/dxos/blob/main/packages/core/halo/keyring/src/keyring.ts#L46)

___

### \_setKey

`Private` **_setKey**(`keyPair`): `Promise`<`void`\>

#### Parameters

| Name | Type |
| :------ | :------ |
| `keyPair` | `CryptoKeyPair` |

#### Returns

`Promise`<`void`\>

#### Defined in

[packages/core/halo/keyring/src/keyring.ts:79](https://github.com/dxos/dxos/blob/main/packages/core/halo/keyring/src/keyring.ts#L79)

___

### createKey

**createKey**(): `Promise`<`PublicKey`\>

#### Returns

`Promise`<`PublicKey`\>

#### Defined in

[packages/core/halo/keyring/src/keyring.ts:35](https://github.com/dxos/dxos/blob/main/packages/core/halo/keyring/src/keyring.ts#L35)

___

### deleteKey

**deleteKey**(`key`): `Promise`<`void`\>

#### Parameters

| Name | Type |
| :------ | :------ |
| `key` | `PublicKey` |

#### Returns

`Promise`<`void`\>

#### Defined in

[packages/core/halo/keyring/src/keyring.ts:95](https://github.com/dxos/dxos/blob/main/packages/core/halo/keyring/src/keyring.ts#L95)

___

### list

**list**(): `Promise`<`PublicKey`[]\>

#### Returns

`Promise`<`PublicKey`[]\>

#### Defined in

[packages/core/halo/keyring/src/keyring.ts:100](https://github.com/dxos/dxos/blob/main/packages/core/halo/keyring/src/keyring.ts#L100)

___

### sign

**sign**(`key`, `message`): `Promise`<`Uint8Array`\>

#### Parameters

| Name | Type |
| :------ | :------ |
| `key` | `PublicKey` |
| `message` | `Uint8Array` |

#### Returns

`Promise`<`Uint8Array`\>

#### Implementation of

Signer.sign

#### Defined in

[packages/core/halo/keyring/src/keyring.ts:26](https://github.com/dxos/dxos/blob/main/packages/core/halo/keyring/src/keyring.ts#L26)
