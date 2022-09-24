# Class: InvitationFactory

Groups together all invitation-related functionality for a single party.

## Table of contents

### Constructors

- [constructor](InvitationFactory.md#constructor)

### Accessors

- [isHalo](InvitationFactory.md#ishalo)

### Methods

- [createInvitation](InvitationFactory.md#createinvitation)
- [createOfflineInvitation](InvitationFactory.md#createofflineinvitation)
- [getOfflineInvitation](InvitationFactory.md#getofflineinvitation)

## Constructors

### constructor

• **new InvitationFactory**(`_partyProcessor`, `_genesisFeedKey`, `_credentialsSigner`, `_credentialsWriter`, `_networkManager`)

#### Parameters

| Name | Type |
| :------ | :------ |
| `_partyProcessor` | [`PartyStateProvider`](../interfaces/PartyStateProvider.md) |
| `_genesisFeedKey` | `PublicKey` |
| `_credentialsSigner` | [`CredentialsSigner`](CredentialsSigner.md) |
| `_credentialsWriter` | `FeedWriter`<`Message`\> |
| `_networkManager` | `NetworkManager` |

#### Defined in

[packages/echo/echo-db/src/invitations/invitation-factory.ts:24](https://github.com/dxos/dxos/blob/6b1348fed/packages/echo/echo-db/src/invitations/invitation-factory.ts#L24)

## Accessors

### isHalo

• `get` **isHalo**(): `boolean`

#### Returns

`boolean`

#### Defined in

[packages/echo/echo-db/src/invitations/invitation-factory.ts:32](https://github.com/dxos/dxos/blob/6b1348fed/packages/echo/echo-db/src/invitations/invitation-factory.ts#L32)

## Methods

### createInvitation

▸ **createInvitation**(`authenticationDetails?`, `options?`): `Promise`<[`InvitationDescriptor`](InvitationDescriptor.md)\>

Creates an invitation for a remote peer.

#### Parameters

| Name | Type | Default value |
| :------ | :------ | :------ |
| `authenticationDetails` | [`InvitationAuthenticator`](../interfaces/InvitationAuthenticator.md) | `defaultInvitationAuthenticator` |
| `options` | [`InvitationOptions`](../interfaces/InvitationOptions.md) | `{}` |

#### Returns

`Promise`<[`InvitationDescriptor`](InvitationDescriptor.md)\>

#### Defined in

[packages/echo/echo-db/src/invitations/invitation-factory.ts:60](https://github.com/dxos/dxos/blob/6b1348fed/packages/echo/echo-db/src/invitations/invitation-factory.ts#L60)

___

### createOfflineInvitation

▸ **createOfflineInvitation**(`publicKey`): `Promise`<[`InvitationDescriptor`](InvitationDescriptor.md)\>

#### Parameters

| Name | Type |
| :------ | :------ |
| `publicKey` | `PublicKey` |

#### Returns

`Promise`<[`InvitationDescriptor`](InvitationDescriptor.md)\>

#### Defined in

[packages/echo/echo-db/src/invitations/invitation-factory.ts:37](https://github.com/dxos/dxos/blob/6b1348fed/packages/echo/echo-db/src/invitations/invitation-factory.ts#L37)

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

[packages/echo/echo-db/src/invitations/invitation-factory.ts:85](https://github.com/dxos/dxos/blob/6b1348fed/packages/echo/echo-db/src/invitations/invitation-factory.ts#L85)
