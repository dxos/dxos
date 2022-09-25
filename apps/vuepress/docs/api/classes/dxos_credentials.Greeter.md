# Class: Greeter

[@dxos/credentials](../modules/dxos_credentials.md).Greeter

Reference Greeter that uses useable, single-use "invitations" to authenticate the invitee.

## Constructors

### constructor

**new Greeter**(`partyKey?`, `_genesisFeedKey?`, `partyWriter?`)

For a Greeter, all parameters must be properly set, but for the Invitee, they can be omitted.
TODO(telackey): Does it make sense to separate out the Invitee functionality?

#### Parameters

| Name | Type | Description |
| :------ | :------ | :------ |
| `partyKey?` | `PublicKeyLike` | The publicKey of the target Party. |
| `_genesisFeedKey?` | `PublicKey` | - |
| `partyWriter?` | [`PartyWriter`](../types/dxos_credentials.PartyWriter.md) | Callback function to write messages to the Party. |

#### Defined in

[packages/halo/credentials/src/greet/greeter.ts:49](https://github.com/dxos/dxos/blob/db8188dae/packages/halo/credentials/src/greet/greeter.ts#L49)

## Properties

### \_invitations

 **\_invitations**: `Map`<`string`, [`Invitation`](dxos_credentials.Invitation.md)\>

#### Defined in

[packages/halo/credentials/src/greet/greeter.ts:41](https://github.com/dxos/dxos/blob/db8188dae/packages/halo/credentials/src/greet/greeter.ts#L41)

___

### \_partyKey

 `Optional` **\_partyKey**: `PublicKey`

#### Defined in

[packages/halo/credentials/src/greet/greeter.ts:39](https://github.com/dxos/dxos/blob/db8188dae/packages/halo/credentials/src/greet/greeter.ts#L39)

___

### \_partyWriter

 `Optional` **\_partyWriter**: [`PartyWriter`](../types/dxos_credentials.PartyWriter.md)

#### Defined in

[packages/halo/credentials/src/greet/greeter.ts:40](https://github.com/dxos/dxos/blob/db8188dae/packages/halo/credentials/src/greet/greeter.ts#L40)

## Methods

### \_getInvitation

`Private` **_getInvitation**(`invitationId`, `secret`): `Promise`<[`Invitation`](dxos_credentials.Invitation.md)\>

Retrieves a valid invitation.

#### Parameters

| Name | Type |
| :------ | :------ |
| `invitationId` | `Buffer` |
| `secret` | `Buffer` |

#### Returns

`Promise`<[`Invitation`](dxos_credentials.Invitation.md)\>

#### Defined in

[packages/halo/credentials/src/greet/greeter.ts:153](https://github.com/dxos/dxos/blob/db8188dae/packages/halo/credentials/src/greet/greeter.ts#L153)

___

### \_handleBegin

**_handleBegin**(`invitationId`): `Promise`<{ `@type`: `string` = 'dxos.halo.credentials.greet.BeginResponse'; `info`: { `authNonce`: { `@type`: `string` = 'google.protobuf.BytesValue'; `value`: `Buffer` = invitation.authNonce } ; `id`: { `@type`: `string` = 'google.protobuf.BytesValue'; `value`: `Buffer` = invitation.id }  }  }\>

#### Parameters

| Name | Type |
| :------ | :------ |
| `invitationId` | `Buffer` |

#### Returns

`Promise`<{ `@type`: `string` = 'dxos.halo.credentials.greet.BeginResponse'; `info`: { `authNonce`: { `@type`: `string` = 'google.protobuf.BytesValue'; `value`: `Buffer` = invitation.authNonce } ; `id`: { `@type`: `string` = 'google.protobuf.BytesValue'; `value`: `Buffer` = invitation.id }  }  }\>

#### Defined in

[packages/halo/credentials/src/greet/greeter.ts:186](https://github.com/dxos/dxos/blob/db8188dae/packages/halo/credentials/src/greet/greeter.ts#L186)

___

### \_handleFinish

`Private` **_handleFinish**(`invitation`): `Promise`<`void`\>

Finish and remove the invitation.

#### Parameters

| Name | Type |
| :------ | :------ |
| `invitation` | [`Invitation`](dxos_credentials.Invitation.md) |

#### Returns

`Promise`<`void`\>

#### Defined in

[packages/halo/credentials/src/greet/greeter.ts:181](https://github.com/dxos/dxos/blob/db8188dae/packages/halo/credentials/src/greet/greeter.ts#L181)

___

### \_handleHandshake

**_handleHandshake**(`invitation`): `Promise`<{ `@type`: `string` = 'dxos.halo.credentials.greet.HandshakeResponse'; `nonce`: `Buffer` = invitation.nonce; `partyKey`: `PublicKey` = invitation.partyKey }\>

#### Parameters

| Name | Type |
| :------ | :------ |
| `invitation` | [`Invitation`](dxos_credentials.Invitation.md) |

#### Returns

`Promise`<{ `@type`: `string` = 'dxos.halo.credentials.greet.HandshakeResponse'; `nonce`: `Buffer` = invitation.nonce; `partyKey`: `PublicKey` = invitation.partyKey }\>

#### Defined in

[packages/halo/credentials/src/greet/greeter.ts:212](https://github.com/dxos/dxos/blob/db8188dae/packages/halo/credentials/src/greet/greeter.ts#L212)

___

### \_handleNotarize

**_handleNotarize**(`invitation`, `params`): `Promise`<`WithTypeUrl`<`NotarizeResponse`\>\>

#### Parameters

| Name | Type |
| :------ | :------ |
| `invitation` | [`Invitation`](dxos_credentials.Invitation.md) |
| `params` | `any`[] |

#### Returns

`Promise`<`WithTypeUrl`<`NotarizeResponse`\>\>

#### Defined in

[packages/halo/credentials/src/greet/greeter.ts:225](https://github.com/dxos/dxos/blob/db8188dae/packages/halo/credentials/src/greet/greeter.ts#L225)

___

### createInvitation

**createInvitation**(`partyKey`, `secretValidator`, `secretProvider?`, `onFinish?`, `expiration?`): `Object`

Issues a new invitation for the indicated Party.  The secretProvider is a function
for obtaining a secret that the invitee must provide for verification.  If present,
expiration should be a Date.

#### Parameters

| Name | Type |
| :------ | :------ |
| `partyKey` | `PublicKeyLike` |
| `secretValidator` | [`SecretValidator`](../types/dxos_credentials.SecretValidator.md) |
| `secretProvider?` | [`SecretProvider`](../types/dxos_credentials.SecretProvider.md) |
| `onFinish?` | [`InvitationOnFinish`](../types/dxos_credentials.InvitationOnFinish.md) |
| `expiration?` | `number` |

#### Returns

`Object`

| Name | Type |
| :------ | :------ |
| `id` | `Buffer` |

#### Defined in

[packages/halo/credentials/src/greet/greeter.ts:74](https://github.com/dxos/dxos/blob/db8188dae/packages/halo/credentials/src/greet/greeter.ts#L74)

___

### createMessageHandler

**createMessageHandler**(): (`message`: `Command`, `remotePeerId`: `Buffer`, `peerId`: `Buffer`) => `Promise`<`void` \| `WithTypeUrl`<`NotarizeResponse`\> \| { `@type`: `string` = 'dxos.halo.credentials.greet.BeginResponse'; `info`: { `authNonce`: { `@type`: `string` = 'google.protobuf.BytesValue'; `value`: `Buffer` = invitation.authNonce } ; `id`: { `@type`: `string` = 'google.protobuf.BytesValue'; `value`: `Buffer` = invitation.id }  }  } \| { `@type`: `string` = 'dxos.halo.credentials.greet.HandshakeResponse'; `nonce`: `Buffer` = invitation.nonce; `partyKey`: `PublicKey` = invitation.partyKey }\>

#### Returns

`fn`

(`message`, `remotePeerId`, `peerId`): `Promise`<`void` \| `WithTypeUrl`<`NotarizeResponse`\> \| { `@type`: `string` = 'dxos.halo.credentials.greet.BeginResponse'; `info`: { `authNonce`: { `@type`: `string` = 'google.protobuf.BytesValue'; `value`: `Buffer` = invitation.authNonce } ; `id`: { `@type`: `string` = 'google.protobuf.BytesValue'; `value`: `Buffer` = invitation.id }  }  } \| { `@type`: `string` = 'dxos.halo.credentials.greet.HandshakeResponse'; `nonce`: `Buffer` = invitation.nonce; `partyKey`: `PublicKey` = invitation.partyKey }\>

##### Parameters

| Name | Type |
| :------ | :------ |
| `message` | `Command` |
| `remotePeerId` | `Buffer` |
| `peerId` | `Buffer` |

##### Returns

`Promise`<`void` \| `WithTypeUrl`<`NotarizeResponse`\> \| { `@type`: `string` = 'dxos.halo.credentials.greet.BeginResponse'; `info`: { `authNonce`: { `@type`: `string` = 'google.protobuf.BytesValue'; `value`: `Buffer` = invitation.authNonce } ; `id`: { `@type`: `string` = 'google.protobuf.BytesValue'; `value`: `Buffer` = invitation.id }  }  } \| { `@type`: `string` = 'dxos.halo.credentials.greet.HandshakeResponse'; `nonce`: `Buffer` = invitation.nonce; `partyKey`: `PublicKey` = invitation.partyKey }\>

#### Defined in

[packages/halo/credentials/src/greet/greeter.ts:94](https://github.com/dxos/dxos/blob/db8188dae/packages/halo/credentials/src/greet/greeter.ts#L94)

___

### handleMessage

**handleMessage**(`message`, `remotePeerId`, `peerId`): `Promise`<`void` \| `WithTypeUrl`<`NotarizeResponse`\> \| { `@type`: `string` = 'dxos.halo.credentials.greet.BeginResponse'; `info`: { `authNonce`: { `@type`: `string` = 'google.protobuf.BytesValue'; `value`: `Buffer` = invitation.authNonce } ; `id`: { `@type`: `string` = 'google.protobuf.BytesValue'; `value`: `Buffer` = invitation.id }  }  } \| { `@type`: `string` = 'dxos.halo.credentials.greet.HandshakeResponse'; `nonce`: `Buffer` = invitation.nonce; `partyKey`: `PublicKey` = invitation.partyKey }\>

Handle a P2P message from the Extension.

#### Parameters

| Name | Type |
| :------ | :------ |
| `message` | `Command` |
| `remotePeerId` | `Buffer` |
| `peerId` | `Buffer` |

#### Returns

`Promise`<`void` \| `WithTypeUrl`<`NotarizeResponse`\> \| { `@type`: `string` = 'dxos.halo.credentials.greet.BeginResponse'; `info`: { `authNonce`: { `@type`: `string` = 'google.protobuf.BytesValue'; `value`: `Buffer` = invitation.authNonce } ; `id`: { `@type`: `string` = 'google.protobuf.BytesValue'; `value`: `Buffer` = invitation.id }  }  } \| { `@type`: `string` = 'dxos.halo.credentials.greet.HandshakeResponse'; `nonce`: `Buffer` = invitation.nonce; `partyKey`: `PublicKey` = invitation.partyKey }\>

#### Defined in

[packages/halo/credentials/src/greet/greeter.ts:107](https://github.com/dxos/dxos/blob/db8188dae/packages/halo/credentials/src/greet/greeter.ts#L107)
