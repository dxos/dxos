# Function: createHaloPartyAdmissionMessage

[@dxos/echo-db](../modules/dxos_echo_db.md).createHaloPartyAdmissionMessage

**createHaloPartyAdmissionMessage**(`credentialsSigner`, `nonce`): `Message`

Create credentials messages that should be written to invite new device to the HALO party.

#### Parameters

| Name | Type |
| :------ | :------ |
| `credentialsSigner` | [`CredentialsSigner`](../classes/dxos_echo_db.CredentialsSigner.md) |
| `nonce` | `Uint8Array` |

#### Returns

`Message`

#### Defined in

[packages/echo/echo-db/src/invitations/greeting-initiator.ts:202](https://github.com/dxos/dxos/blob/main/packages/echo/echo-db/src/invitations/greeting-initiator.ts#L202)
