# Function: createDataPartyAdmissionMessages

[@dxos/echo-db](../modules/dxos_echo_db.md).createDataPartyAdmissionMessages

**createDataPartyAdmissionMessages**(`credentialsSigner`, `partyKey`, `identityGenesis`, `nonce`): `Message`

Create credentials messages that should be written to invite member to the data party.

#### Parameters

| Name | Type |
| :------ | :------ |
| `credentialsSigner` | [`CredentialsSigner`](../classes/dxos_echo_db.CredentialsSigner.md) |
| `partyKey` | `PublicKey` |
| `identityGenesis` | `SignedMessage` |
| `nonce` | `Uint8Array` |

#### Returns

`Message`

#### Defined in

[packages/echo/echo-db/src/invitations/greeting-initiator.ts:216](https://github.com/dxos/dxos/blob/db8188dae/packages/echo/echo-db/src/invitations/greeting-initiator.ts#L216)
