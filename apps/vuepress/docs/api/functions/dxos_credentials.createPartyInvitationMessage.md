# Function: createPartyInvitationMessage

[@dxos/credentials](../modules/dxos_credentials.md).createPartyInvitationMessage

**createPartyInvitationMessage**(`signer`, `partyKey`, `inviteeKey`, `issuerKey`, `signingKey?`): `Object`

Create a `dxos.credentials.party.PartyInvitation` message.

#### Parameters

| Name | Type |
| :------ | :------ |
| `signer` | [`Signer`](../interfaces/dxos_credentials.Signer.md) |
| `partyKey` | `PublicKeyLike` |
| `inviteeKey` | `PublicKeyLike` |
| `issuerKey` | `KeyRecord` \| `KeyChain` |
| `signingKey?` | `KeyRecord` \| `KeyChain` |

#### Returns

`Object`

| Name | Type |
| :------ | :------ |
| `@type` | `string` |
| `payload` | `WithTypeUrl`<`SignedMessage`\> |

#### Defined in

[packages/halo/credentials/src/party/party-credential.ts:275](https://github.com/dxos/dxos/blob/db8188dae/packages/halo/credentials/src/party/party-credential.ts#L275)
