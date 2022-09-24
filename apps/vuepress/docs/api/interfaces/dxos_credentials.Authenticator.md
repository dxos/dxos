# Interface: Authenticator

[@dxos/credentials](../modules/dxos_credentials.md).Authenticator

Interface for Authenticators.
Used by AuthPlugin for authenticating nodes during handshake.

## Implemented by

- [`PartyAuthenticator`](../classes/dxos_credentials.PartyAuthenticator.md)

## Table of contents

### Methods

- [authenticate](dxos_credentials.Authenticator.md#authenticate)

## Methods

### authenticate

▸ **authenticate**(`credentials`): `Promise`<`boolean`\>

Return true if the credentials checkout, else false.

#### Parameters

| Name | Type |
| :------ | :------ |
| `credentials` | `SignedMessage` |

#### Returns

`Promise`<`boolean`\>

#### Defined in

[packages/halo/credentials/src/auth/authenticator.ts:29](https://github.com/dxos/dxos/blob/e3b936721/packages/halo/credentials/src/auth/authenticator.ts#L29)
