# Class: PartyInvitationManager

[@dxos/credentials](../modules/dxos_credentials.md).PartyInvitationManager

A class to manage the lifecycle of invitations which are written to the Party.

**`Package`**

## Table of contents

### Constructors

- [constructor](dxos_credentials.PartyInvitationManager.md#constructor)

### Properties

- [\_activeInvitations](dxos_credentials.PartyInvitationManager.md#_activeinvitations)
- [\_invitationsByKey](dxos_credentials.PartyInvitationManager.md#_invitationsbykey)
- [\_party](dxos_credentials.PartyInvitationManager.md#_party)

### Methods

- [\_verifyAndParse](dxos_credentials.PartyInvitationManager.md#_verifyandparse)
- [getInvitation](dxos_credentials.PartyInvitationManager.md#getinvitation)
- [recordInvitation](dxos_credentials.PartyInvitationManager.md#recordinvitation)

## Constructors

### constructor

• **new PartyInvitationManager**(`party`)

#### Parameters

| Name | Type |
| :------ | :------ |
| `party` | [`PartyState`](dxos_credentials.PartyState.md) |

#### Defined in

[packages/halo/credentials/src/party/party-invitation-manager.ts:26](https://github.com/dxos/dxos/blob/e3b936721/packages/halo/credentials/src/party/party-invitation-manager.ts#L26)

## Properties

### \_activeInvitations

• **\_activeInvitations**: `Map`<`string`, `SignedMessage`\>

#### Defined in

[packages/halo/credentials/src/party/party-invitation-manager.ts:23](https://github.com/dxos/dxos/blob/e3b936721/packages/halo/credentials/src/party/party-invitation-manager.ts#L23)

___

### \_invitationsByKey

• **\_invitationsByKey**: `Map`<`string`, `Set`<`string`\>\>

#### Defined in

[packages/halo/credentials/src/party/party-invitation-manager.ts:24](https://github.com/dxos/dxos/blob/e3b936721/packages/halo/credentials/src/party/party-invitation-manager.ts#L24)

___

### \_party

• **\_party**: [`PartyState`](dxos_credentials.PartyState.md)

#### Defined in

[packages/halo/credentials/src/party/party-invitation-manager.ts:22](https://github.com/dxos/dxos/blob/e3b936721/packages/halo/credentials/src/party/party-invitation-manager.ts#L22)

## Methods

### \_verifyAndParse

▸ `Private` **_verifyAndParse**(`invitationMessage`): `any`

Verify that the PartyInvitation message is properly formed and validly signed.

#### Parameters

| Name | Type |
| :------ | :------ |
| `invitationMessage` | `SignedMessage` |

#### Returns

`any`

#### Defined in

[packages/halo/credentials/src/party/party-invitation-manager.ts:79](https://github.com/dxos/dxos/blob/e3b936721/packages/halo/credentials/src/party/party-invitation-manager.ts#L79)

___

### getInvitation

▸ **getInvitation**(`invitationID`): `undefined` \| `SignedMessage`

Return the Message for `invitationID`, if known.

#### Parameters

| Name | Type |
| :------ | :------ |
| `invitationID` | `Buffer` |

#### Returns

`undefined` \| `SignedMessage`

#### Defined in

[packages/halo/credentials/src/party/party-invitation-manager.ts:46](https://github.com/dxos/dxos/blob/e3b936721/packages/halo/credentials/src/party/party-invitation-manager.ts#L46)

___

### recordInvitation

▸ **recordInvitation**(`invitationMessage`): `void`

Record a new PartyInvitation message.

#### Parameters

| Name | Type |
| :------ | :------ |
| `invitationMessage` | `SignedMessage` |

#### Returns

`void`

#### Defined in

[packages/halo/credentials/src/party/party-invitation-manager.ts:54](https://github.com/dxos/dxos/blob/e3b936721/packages/halo/credentials/src/party/party-invitation-manager.ts#L54)
