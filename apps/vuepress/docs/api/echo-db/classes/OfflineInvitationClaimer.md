# Class: OfflineInvitationClaimer

Class to facilitate making an unauthenticated connection to an existing Party in order to claim an
offline invitation. If successful, the regular interactive Greeting flow will follow.

## Table of contents

### Constructors

- [constructor](OfflineInvitationClaimer.md#constructor)

### Properties

- [\_greeterPlugin](OfflineInvitationClaimer.md#_greeterplugin)
- [\_state](OfflineInvitationClaimer.md#_state)

### Accessors

- [state](OfflineInvitationClaimer.md#state)

### Methods

- [claim](OfflineInvitationClaimer.md#claim)
- [connect](OfflineInvitationClaimer.md#connect)
- [destroy](OfflineInvitationClaimer.md#destroy)
- [disconnect](OfflineInvitationClaimer.md#disconnect)
- [createOfflineInvitationClaimHandler](OfflineInvitationClaimer.md#createofflineinvitationclaimhandler)
- [createSecretProvider](OfflineInvitationClaimer.md#createsecretprovider)

## Constructors

### constructor

• **new OfflineInvitationClaimer**(`_networkManager`, `_invitationDescriptor`)

#### Parameters

| Name | Type |
| :------ | :------ |
| `_networkManager` | `NetworkManager` |
| `_invitationDescriptor` | [`InvitationDescriptor`](InvitationDescriptor.md) |

#### Defined in

[packages/echo/echo-db/src/invitations/offline-invitation-claimer.ts:48](https://github.com/dxos/dxos/blob/6b1348fed/packages/echo/echo-db/src/invitations/offline-invitation-claimer.ts#L48)

## Properties

### \_greeterPlugin

• `Optional` **\_greeterPlugin**: `GreetingCommandPlugin`

#### Defined in

[packages/echo/echo-db/src/invitations/offline-invitation-claimer.ts:45](https://github.com/dxos/dxos/blob/6b1348fed/packages/echo/echo-db/src/invitations/offline-invitation-claimer.ts#L45)

___

### \_state

• **\_state**: [`GreetingState`](../enums/GreetingState.md) = `GreetingState.INITIALIZED`

#### Defined in

[packages/echo/echo-db/src/invitations/offline-invitation-claimer.ts:46](https://github.com/dxos/dxos/blob/6b1348fed/packages/echo/echo-db/src/invitations/offline-invitation-claimer.ts#L46)

## Accessors

### state

• `get` **state**(): [`GreetingState`](../enums/GreetingState.md)

#### Returns

[`GreetingState`](../enums/GreetingState.md)

#### Defined in

[packages/echo/echo-db/src/invitations/offline-invitation-claimer.ts:55](https://github.com/dxos/dxos/blob/6b1348fed/packages/echo/echo-db/src/invitations/offline-invitation-claimer.ts#L55)

## Methods

### claim

▸ **claim**(): `Promise`<[`InvitationDescriptor`](InvitationDescriptor.md)\>

Executes a 'CLAIM' command for an offline invitation.  If successful, the Party member's device will begin
interactive Greeting, with a new invitation and swarm key which will be provided to the claimant.
Those will be returned in the form of an InvitationDescriptor.

#### Returns

`Promise`<[`InvitationDescriptor`](InvitationDescriptor.md)\>

#### Defined in

[packages/echo/echo-db/src/invitations/offline-invitation-claimer.ts:98](https://github.com/dxos/dxos/blob/6b1348fed/packages/echo/echo-db/src/invitations/offline-invitation-claimer.ts#L98)

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

[packages/echo/echo-db/src/invitations/offline-invitation-claimer.ts:63](https://github.com/dxos/dxos/blob/6b1348fed/packages/echo/echo-db/src/invitations/offline-invitation-claimer.ts#L63)

___

### destroy

▸ **destroy**(): `Promise`<`void`\>

#### Returns

`Promise`<`void`\>

#### Defined in

[packages/echo/echo-db/src/invitations/offline-invitation-claimer.ts:128](https://github.com/dxos/dxos/blob/6b1348fed/packages/echo/echo-db/src/invitations/offline-invitation-claimer.ts#L128)

___

### disconnect

▸ **disconnect**(): `Promise`<`void`\>

#### Returns

`Promise`<`void`\>

#### Defined in

[packages/echo/echo-db/src/invitations/offline-invitation-claimer.ts:122](https://github.com/dxos/dxos/blob/6b1348fed/packages/echo/echo-db/src/invitations/offline-invitation-claimer.ts#L122)

___

### createOfflineInvitationClaimHandler

▸ `Static` **createOfflineInvitationClaimHandler**(`invitationManager`): (`message`: `any`, `remotePeerId`: `Buffer`, `peerId`: `Buffer`) => `Promise`<`WithTypeUrl`<`ClaimResponse`\>\>

Create a function for handling PartyInvitation claims on the indicated Party. This is used by members
of the Party for responding to attempts to claim an Invitation which has been written to the Party.

#### Parameters

| Name | Type |
| :------ | :------ |
| `invitationManager` | [`InvitationFactory`](InvitationFactory.md) |

#### Returns

`fn`

▸ (`message`, `remotePeerId`, `peerId`): `Promise`<`WithTypeUrl`<`ClaimResponse`\>\>

Create a function for handling PartyInvitation claims on the indicated Party. This is used by members
of the Party for responding to attempts to claim an Invitation which has been written to the Party.

##### Parameters

| Name | Type |
| :------ | :------ |
| `message` | `any` |
| `remotePeerId` | `Buffer` |
| `peerId` | `Buffer` |

##### Returns

`Promise`<`WithTypeUrl`<`ClaimResponse`\>\>

#### Defined in

[packages/echo/echo-db/src/invitations/offline-invitation-claimer.ts:140](https://github.com/dxos/dxos/blob/6b1348fed/packages/echo/echo-db/src/invitations/offline-invitation-claimer.ts#L140)

___

### createSecretProvider

▸ `Static` **createSecretProvider**(`credentials`): `SecretProvider`

#### Parameters

| Name | Type |
| :------ | :------ |
| `credentials` | [`CredentialsSigner`](CredentialsSigner.md) |

#### Returns

`SecretProvider`

#### Defined in

[packages/echo/echo-db/src/invitations/offline-invitation-claimer.ts:178](https://github.com/dxos/dxos/blob/6b1348fed/packages/echo/echo-db/src/invitations/offline-invitation-claimer.ts#L178)
