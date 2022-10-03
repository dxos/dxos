# Function: createEnvelopeMessage

[@dxos/credentials](../modules/dxos_credentials.md).createEnvelopeMessage

**createEnvelopeMessage**(`signer`, `partyKey`, `contents`, `signingKeys?`, `nonce?`): `Message`

A signed message containing a signed message. This is used when wishing to write a message on behalf of another,
as in Greeting, or when copying a message from Party to another, such as copying an IdentityInfo message from the
HALO to a Party that is being joined.

#### Parameters

| Name | Type | Default value |
| :------ | :------ | :------ |
| `signer` | [`Signer`](../interfaces/dxos_credentials.Signer.md) | `undefined` |
| `partyKey` | `PublicKeyLike` | `undefined` |
| `contents` | `Message` | `undefined` |
| `signingKeys` | (`KeyRecord` \| `KeyChain`)[] | `[]` |
| `nonce?` | `Buffer` | `undefined` |

#### Returns

`Message`

Signed message.

#### Defined in

[packages/halo/credentials/src/party/party-credential.ts:115](https://github.com/dxos/dxos/blob/main/packages/halo/credentials/src/party/party-credential.ts#L115)
