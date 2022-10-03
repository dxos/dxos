# Function: createKeyAdmitMessage

[@dxos/credentials](../modules/dxos_credentials.md).createKeyAdmitMessage

**createKeyAdmitMessage**(`signer`, `partyKey`, `admitKeyPair`, `signingKeys?`, `nonce?`): `Message`

Admit a single key to the Party.
This message must be signed by the key to be admitted, and unless the contents
of an Envelope, also by a key which has already been admitted.

#### Parameters

| Name | Type | Default value |
| :------ | :------ | :------ |
| `signer` | [`Signer`](../interfaces/dxos_credentials.Signer.md) | `undefined` |
| `partyKey` | `PublicKeyLike` | `undefined` |
| `admitKeyPair` | `KeyRecord` | `undefined` |
| `signingKeys` | (`KeyRecord` \| `KeyChain`)[] | `[]` |
| `nonce?` | `Buffer` | `undefined` |

#### Returns

`Message`

#### Defined in

[packages/halo/credentials/src/party/party-credential.ts:61](https://github.com/dxos/dxos/blob/main/packages/halo/credentials/src/party/party-credential.ts#L61)
