# Function: getPartyCredentialMessageType

[@dxos/credentials](../modules/dxos_credentials.md).getPartyCredentialMessageType

**getPartyCredentialMessageType**(`message`, `deep?`): `Type`

Returns the PartyCredential.Type for the message.

#### Parameters

| Name | Type | Default value | Description |
| :------ | :------ | :------ | :------ |
| `message` | `Message` \| `SignedMessage` | `undefined` |  |
| `deep?` | `boolean` | `true` | Whether to return the inner type of a message if it is in an ENVELOPE. |

#### Returns

`Type`

#### Defined in

[packages/halo/credentials/src/party/party-credential.ts:218](https://github.com/dxos/dxos/blob/main/packages/halo/credentials/src/party/party-credential.ts#L218)
