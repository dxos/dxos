# Class: InvitationFactory

[@dxos/echo-db](../modules/dxos_echo_db.md).InvitationFactory

Groups together all invitation-related functionality for a single party.

## Table of contents

### Constructors

- [constructor](dxos_echo_db.InvitationFactory.md#constructor)

### Accessors

- [isHalo](dxos_echo_db.InvitationFactory.md#ishalo)

### Methods

- [createInvitation](dxos_echo_db.InvitationFactory.md#createinvitation)
- [createOfflineInvitation](dxos_echo_db.InvitationFactory.md#createofflineinvitation)
- [getOfflineInvitation](dxos_echo_db.InvitationFactory.md#getofflineinvitation)

## Constructors

### constructor

• **new InvitationFactory**(`_partyProcessor`, `_genesisFeedKey`, `_credentialsSigner`, `_credentialsWriter`, `_networkManager`)

#### Parameters

| Name | Type |
| :------ | :------ |
| `_partyProcessor` | [`PartyStateProvider`](../interfaces/dxos_echo_db.PartyStateProvider.md) |
| `_genesisFeedKey` | `PublicKey` |
| `_credentialsSigner` | [`CredentialsSigner`](dxos_echo_db.CredentialsSigner.md) |
| `_credentialsWriter` | `FeedWriter`<`Message`\> |
| `_networkManager` | `NetworkManager` |

#### Defined in

[packages/echo/echo-db/src/invitations/invitation-factory.ts:24](https://github.com/dxos/dxos/blob/e3b936721/packages/echo/echo-db/src/invitations/invitation-factory.ts#L24)

## Accessors

### isHalo

• `get` **isHalo**(): `boolean`

#### Returns

`boolean`

#### Defined in

[packages/echo/echo-db/src/invitations/invitation-factory.ts:32](https://github.com/dxos/dxos/blob/e3b936721/packages/echo/echo-db/src/invitations/invitation-factory.ts#L32)

## Methods

### createInvitation

▸ **createInvitation**(`authenticationDetails?`, `options?`): `Promise`<[`InvitationDescriptor`](dxos_echo_db.InvitationDescriptor.md)\>

Creates an invitation for a remote peer.

#### Parameters

| Name | Type | Default value |
| :------ | :------ | :------ |
| `authenticationDetails` | [`InvitationAuthenticator`](../interfaces/dxos_echo_db.InvitationAuthenticator.md) | `defaultInvitationAuthenticator` |
| `options` | [`InvitationOptions`](../interfaces/dxos_echo_db.InvitationOptions.md) | `{}` |

#### Returns

`Promise`<[`InvitationDescriptor`](dxos_echo_db.InvitationDescriptor.md)\>

#### Defined in

[packages/echo/echo-db/src/invitations/invitation-factory.ts:60](https://github.com/dxos/dxos/blob/e3b936721/packages/echo/echo-db/src/invitations/invitation-factory.ts#L60)

___

### createOfflineInvitation

▸ **createOfflineInvitation**(`publicKey`): `Promise`<[`InvitationDescriptor`](dxos_echo_db.InvitationDescriptor.md)\>

#### Parameters

| Name | Type |
| :------ | :------ |
| `publicKey` | `PublicKey` |

#### Returns

`Promise`<[`InvitationDescriptor`](dxos_echo_db.InvitationDescriptor.md)\>

#### Defined in

[packages/echo/echo-db/src/invitations/invitation-factory.ts:37](https://github.com/dxos/dxos/blob/e3b936721/packages/echo/echo-db/src/invitations/invitation-factory.ts#L37)

___

### getOfflineInvitation

▸ **getOfflineInvitation**(`invitationId`): `undefined` \| `SignedMessage`

#### Parameters

| Name | Type |
| :------ | :------ |
| `invitationId` | `Buffer` |

#### Returns

`undefined` \| `SignedMessage`

#### Defined in

[packages/echo/echo-db/src/invitations/invitation-factory.ts:85](https://github.com/dxos/dxos/blob/e3b936721/packages/echo/echo-db/src/invitations/invitation-factory.ts#L85)
