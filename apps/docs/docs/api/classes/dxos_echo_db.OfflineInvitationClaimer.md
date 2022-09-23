---
id: "dxos_echo_db.OfflineInvitationClaimer"
title: "Class: OfflineInvitationClaimer"
sidebar_label: "OfflineInvitationClaimer"
custom_edit_url: null
---

[@dxos/echo-db](../modules/dxos_echo_db.md).OfflineInvitationClaimer

Class to facilitate making an unauthenticated connection to an existing Party in order to claim an
offline invitation. If successful, the regular interactive Greeting flow will follow.

## Constructors

### constructor

• **new OfflineInvitationClaimer**(`_networkManager`, `_invitationDescriptor`)

#### Parameters

| Name | Type |
| :------ | :------ |
| `_networkManager` | `NetworkManager` |
| `_invitationDescriptor` | [`InvitationDescriptor`](dxos_echo_db.InvitationDescriptor.md) |

#### Defined in

[packages/echo/echo-db/src/invitations/offline-invitation-claimer.ts:46](https://github.com/dxos/protocols/blob/6f4c34af3/packages/echo/echo-db/src/invitations/offline-invitation-claimer.ts#L46)

## Properties

### \_greeterPlugin

• `Optional` **\_greeterPlugin**: `GreetingCommandPlugin`

#### Defined in

[packages/echo/echo-db/src/invitations/offline-invitation-claimer.ts:43](https://github.com/dxos/protocols/blob/6f4c34af3/packages/echo/echo-db/src/invitations/offline-invitation-claimer.ts#L43)

___

### \_state

• **\_state**: [`GreetingState`](../enums/dxos_echo_db.GreetingState.md) = `GreetingState.INITIALIZED`

#### Defined in

[packages/echo/echo-db/src/invitations/offline-invitation-claimer.ts:44](https://github.com/dxos/protocols/blob/6f4c34af3/packages/echo/echo-db/src/invitations/offline-invitation-claimer.ts#L44)

## Accessors

### state

• `get` **state**(): [`GreetingState`](../enums/dxos_echo_db.GreetingState.md)

#### Returns

[`GreetingState`](../enums/dxos_echo_db.GreetingState.md)

#### Defined in

[packages/echo/echo-db/src/invitations/offline-invitation-claimer.ts:53](https://github.com/dxos/protocols/blob/6f4c34af3/packages/echo/echo-db/src/invitations/offline-invitation-claimer.ts#L53)

## Methods

### claim

▸ **claim**(): `Promise`<[`InvitationDescriptor`](dxos_echo_db.InvitationDescriptor.md)\>

Executes a 'CLAIM' command for an offline invitation.  If successful, the Party member's device will begin
interactive Greeting, with a new invitation and swarm key which will be provided to the claimant.
Those will be returned in the form of an InvitationDescriptor.

#### Returns

`Promise`<[`InvitationDescriptor`](dxos_echo_db.InvitationDescriptor.md)\>

#### Defined in

[packages/echo/echo-db/src/invitations/offline-invitation-claimer.ts:96](https://github.com/dxos/protocols/blob/6f4c34af3/packages/echo/echo-db/src/invitations/offline-invitation-claimer.ts#L96)

___

### connect

▸ **connect**(`timeout?`): `Promise`<`void`\>

Initiate a connection to some Party member node.

#### Parameters

| Name | Type | Default value | Description |
| :------ | :------ | :------ | :------ |
| `timeout` | `number` | `DEFAULT_TIMEOUT` | Connection timeout (ms). |

#### Returns

`Promise`<`void`\>

#### Defined in

[packages/echo/echo-db/src/invitations/offline-invitation-claimer.ts:61](https://github.com/dxos/protocols/blob/6f4c34af3/packages/echo/echo-db/src/invitations/offline-invitation-claimer.ts#L61)

___

### destroy

▸ **destroy**(): `Promise`<`void`\>

#### Returns

`Promise`<`void`\>

#### Defined in

[packages/echo/echo-db/src/invitations/offline-invitation-claimer.ts:125](https://github.com/dxos/protocols/blob/6f4c34af3/packages/echo/echo-db/src/invitations/offline-invitation-claimer.ts#L125)

___

### disconnect

▸ **disconnect**(): `Promise`<`void`\>

#### Returns

`Promise`<`void`\>

#### Defined in

[packages/echo/echo-db/src/invitations/offline-invitation-claimer.ts:119](https://github.com/dxos/protocols/blob/6f4c34af3/packages/echo/echo-db/src/invitations/offline-invitation-claimer.ts#L119)

___

### createOfflineInvitationClaimHandler

▸ `Static` **createOfflineInvitationClaimHandler**(`invitationManager`): (`message`: `any`, `remotePeerId`: `Buffer`, `peerId`: `Buffer`) => `Promise`<`WithTypeUrl`<`ClaimResponse`\>\>

Create a function for handling PartyInvitation claims on the indicated Party. This is used by members
of the Party for responding to attempts to claim an Invitation which has been written to the Party.

#### Parameters

| Name | Type |
| :------ | :------ |
| `invitationManager` | [`InvitationFactory`](dxos_echo_db.InvitationFactory.md) |

#### Returns

`fn`

▸ (`message`, `remotePeerId`, `peerId`): `Promise`<`WithTypeUrl`<`ClaimResponse`\>\>

##### Parameters

| Name | Type |
| :------ | :------ |
| `message` | `any` |
| `remotePeerId` | `Buffer` |
| `peerId` | `Buffer` |

##### Returns

`Promise`<`WithTypeUrl`<`ClaimResponse`\>\>

#### Defined in

[packages/echo/echo-db/src/invitations/offline-invitation-claimer.ts:137](https://github.com/dxos/protocols/blob/6f4c34af3/packages/echo/echo-db/src/invitations/offline-invitation-claimer.ts#L137)

___

### createSecretProvider

▸ `Static` **createSecretProvider**(`credentials`): `SecretProvider`

#### Parameters

| Name | Type |
| :------ | :------ |
| `credentials` | [`CredentialsSigner`](dxos_echo_db.CredentialsSigner.md) |

#### Returns

`SecretProvider`

#### Defined in

[packages/echo/echo-db/src/invitations/offline-invitation-claimer.ts:173](https://github.com/dxos/protocols/blob/6f4c34af3/packages/echo/echo-db/src/invitations/offline-invitation-claimer.ts#L173)
