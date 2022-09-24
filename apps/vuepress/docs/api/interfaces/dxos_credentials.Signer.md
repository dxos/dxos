# Interface: Signer

[@dxos/credentials](../modules/dxos_credentials.md).Signer

## Implemented by

- [`Keyring`](../classes/dxos_credentials.Keyring.md)

## Table of contents

### Methods

- [rawSign](dxos_credentials.Signer.md#rawsign)
- [sign](dxos_credentials.Signer.md#sign)

## Methods

### rawSign

▸ **rawSign**(`data`, `keyRecord`): `Buffer`

Sign the data with the indicated key and return the signature.
KeyChains are not supported.

#### Parameters

| Name | Type |
| :------ | :------ |
| `data` | `Buffer` |
| `keyRecord` | `KeyRecord` |

#### Returns

`Buffer`

#### Defined in

[packages/halo/credentials/src/keys/signer.ts:26](https://github.com/dxos/dxos/blob/e3b936721/packages/halo/credentials/src/keys/signer.ts#L26)

___

### sign

▸ **sign**(`message`, `keys`, `nonce?`, `created?`): `WithTypeUrl`<`SignedMessage`\>

Sign the message with the indicated key or keys. The returned signed object will be of the form:
{
  signed: { ... }, // The message as signed, including timestamp and nonce.
  signatures: []   // An array with signature and publicKey of each signing key.
}

#### Parameters

| Name | Type |
| :------ | :------ |
| `message` | `any` |
| `keys` | [`SigningKey`](../modules/dxos_credentials.md#signingkey)[] |
| `nonce?` | `Buffer` |
| `created?` | `string` |

#### Returns

`WithTypeUrl`<`SignedMessage`\>

#### Defined in

[packages/halo/credentials/src/keys/signer.ts:20](https://github.com/dxos/dxos/blob/e3b936721/packages/halo/credentials/src/keys/signer.ts#L20)
