# Class: PartyAuthenticator

[@dxos/credentials](../modules/dxos_credentials.md).PartyAuthenticator

A Party-based Authenticator, which checks that the supplied credentials belong to a Party member.

## Implements

- [`Authenticator`](../interfaces/dxos_credentials.Authenticator.md)

## Constructors

### constructor

**new PartyAuthenticator**(`_party`, `_onAuthenticated?`)

Takes the target Party for checking admitted keys and verifying signatures.

#### Parameters

| Name | Type |
| :------ | :------ |
| `_party` | [`PartyState`](dxos_credentials.PartyState.md) |
| `_onAuthenticated?` | (`auth`: `Auth`) => `Promise`<`void`\> |

#### Defined in

[packages/halo/credentials/src/auth/authenticator.ts:40](https://github.com/dxos/dxos/blob/main/packages/halo/credentials/src/auth/authenticator.ts#L40)

## Methods

### authenticate

**authenticate**(`credentials`): `Promise`<`boolean`\>

Authenticate the credentials presented during handshake. The signature on the credentials must be valid and belong
to a key already admitted to the Party.

#### Parameters

| Name | Type |
| :------ | :------ |
| `credentials` | `SignedMessage` |

#### Returns

`Promise`<`boolean`\>

true if authenticated, else false

#### Implementation of

[Authenticator](../interfaces/dxos_credentials.Authenticator.md).[authenticate](../interfaces/dxos_credentials.Authenticator.md#authenticate)

#### Defined in

[packages/halo/credentials/src/auth/authenticator.ts:53](https://github.com/dxos/dxos/blob/main/packages/halo/credentials/src/auth/authenticator.ts#L53)
