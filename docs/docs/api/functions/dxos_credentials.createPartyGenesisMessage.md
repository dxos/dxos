# Function: createPartyGenesisMessage

[@dxos/credentials](../modules/dxos_credentials.md).createPartyGenesisMessage

**createPartyGenesisMessage**(`signer`, `partyKeyPair`, `feedKey`, `admitKeyPair`): `Message`

The start-of-authority record for the Party, admitting a single key (usually a identity) and a single feed.
It must be signed by all three keys (party, key, feed).
The Party private key should be destroyed after signing this message.

#### Parameters

| Name | Type |
| :------ | :------ |
| `signer` | [`Signer`](../interfaces/dxos_credentials.Signer.md) |
| `partyKeyPair` | `KeyRecord` |
| `feedKey` | `PublicKey` |
| `admitKeyPair` | `KeyRecord` |

#### Returns

`Message`

Signed message

#### Defined in

[packages/halo/credentials/src/party/party-credential.ts:34](https://github.com/dxos/dxos/blob/main/packages/halo/credentials/src/party/party-credential.ts#L34)
