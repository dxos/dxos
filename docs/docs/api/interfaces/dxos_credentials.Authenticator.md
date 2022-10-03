# Interface: Authenticator

[@dxos/credentials](../modules/dxos_credentials.md).Authenticator

Interface for Authenticators.
Used by AuthPlugin for authenticating nodes during handshake.

## Implemented by

- [`PartyAuthenticator`](../classes/dxos_credentials.PartyAuthenticator.md)

## Methods

### authenticate

**authenticate**(`credentials`): `Promise`<`boolean`\>

Return true if the credentials checkout, else false.

#### Parameters

| Name | Type |
| :------ | :------ |
| `credentials` | `SignedMessage` |

#### Returns

`Promise`<`boolean`\>

#### Defined in

[packages/halo/credentials/src/auth/authenticator.ts:29](https://github.com/dxos/dxos/blob/main/packages/halo/credentials/src/auth/authenticator.ts#L29)
