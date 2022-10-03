# Function: createFeedAdmitMessage

[@dxos/credentials](../modules/dxos_credentials.md).createFeedAdmitMessage

**createFeedAdmitMessage**(`signer`, `partyKey`, `feedKey`, `signingKeys?`, `nonce?`): `Message`

Admit a single feed to the Party. This message must be signed by the feed key to be admitted, also by some other
key which has already been admitted (usually by a device identity key).

#### Parameters

| Name | Type | Default value |
| :------ | :------ | :------ |
| `signer` | [`Signer`](../interfaces/dxos_credentials.Signer.md) | `undefined` |
| `partyKey` | `PublicKeyLike` | `undefined` |
| `feedKey` | `PublicKey` | `undefined` |
| `signingKeys` | (`PublicKey` \| `KeyRecord` \| `KeyChain`)[] | `[]` |
| `nonce?` | `Buffer` | `undefined` |

#### Returns

`Message`

#### Defined in

[packages/halo/credentials/src/party/party-credential.ts:87](https://github.com/dxos/dxos/blob/main/packages/halo/credentials/src/party/party-credential.ts#L87)
