# Function: createGreetingNotarizeMessage

[@dxos/credentials](../modules/dxos_credentials.md).createGreetingNotarizeMessage

**createGreetingNotarizeMessage**(`secret`, `credentialMessages`): `WithTypeUrl`<`Command`\>

Create a Greeting 'NOTARIZE' command message.

#### Parameters

| Name | Type |
| :------ | :------ |
| `secret` | `Buffer` |
| `credentialMessages` | `WithTypeUrl`<`Message` \| `SignedMessage`\>[] |

#### Returns

`WithTypeUrl`<`Command`\>

#### Defined in

[packages/halo/credentials/src/greet/greeting-message.ts:41](https://github.com/dxos/dxos/blob/main/packages/halo/credentials/src/greet/greeting-message.ts#L41)
