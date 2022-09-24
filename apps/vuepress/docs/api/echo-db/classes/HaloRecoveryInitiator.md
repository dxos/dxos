# Class: HaloRecoveryInitiator

Class to facilitate making a unsolicited connections to an existing HALO Party to ask for entrance.
If successful, regular Greeting will follow authenticated by the Identity key (usually recovered from
seed phrase).

TODO(telackey): DoS mitigation

## Table of contents

### Constructors

- [constructor](HaloRecoveryInitiator.md#constructor)

### Properties

- [\_greeterPlugin](HaloRecoveryInitiator.md#_greeterplugin)
- [\_peerId](HaloRecoveryInitiator.md#_peerid)
- [\_state](HaloRecoveryInitiator.md#_state)

### Accessors

- [state](HaloRecoveryInitiator.md#state)

### Methods

- [claim](HaloRecoveryInitiator.md#claim)
- [connect](HaloRecoveryInitiator.md#connect)
- [createSecretProvider](HaloRecoveryInitiator.md#createsecretprovider)
- [destroy](HaloRecoveryInitiator.md#destroy)
- [disconnect](HaloRecoveryInitiator.md#disconnect)
- [createHaloInvitationClaimHandler](HaloRecoveryInitiator.md#createhaloinvitationclaimhandler)

## Constructors

### constructor

• **new HaloRecoveryInitiator**(`_networkManager`, `_credentialsSigner`)

#### Parameters

| Name | Type |
| :------ | :------ |
| `_networkManager` | `NetworkManager` |
| `_credentialsSigner` | [`CredentialsSigner`](CredentialsSigner.md) |

#### Defined in

[packages/echo/echo-db/src/invitations/halo-recovery-initiator.ts:51](https://github.com/dxos/dxos/blob/6b1348fed/packages/echo/echo-db/src/invitations/halo-recovery-initiator.ts#L51)

## Properties

### \_greeterPlugin

• `Optional` **\_greeterPlugin**: `GreetingCommandPlugin`

#### Defined in

[packages/echo/echo-db/src/invitations/halo-recovery-initiator.ts:48](https://github.com/dxos/dxos/blob/6b1348fed/packages/echo/echo-db/src/invitations/halo-recovery-initiator.ts#L48)

___

### \_peerId

• `Optional` **\_peerId**: `Buffer`

#### Defined in

[packages/echo/echo-db/src/invitations/halo-recovery-initiator.ts:49](https://github.com/dxos/dxos/blob/6b1348fed/packages/echo/echo-db/src/invitations/halo-recovery-initiator.ts#L49)

___

### \_state

• **\_state**: [`GreetingState`](../enums/GreetingState.md)

#### Defined in

[packages/echo/echo-db/src/invitations/halo-recovery-initiator.ts:47](https://github.com/dxos/dxos/blob/6b1348fed/packages/echo/echo-db/src/invitations/halo-recovery-initiator.ts#L47)

## Accessors

### state

• `get` **state**(): [`GreetingState`](../enums/GreetingState.md)

#### Returns

[`GreetingState`](../enums/GreetingState.md)

#### Defined in

[packages/echo/echo-db/src/invitations/halo-recovery-initiator.ts:58](https://github.com/dxos/dxos/blob/6b1348fed/packages/echo/echo-db/src/invitations/halo-recovery-initiator.ts#L58)

## Methods

### claim

▸ **claim**(): `Promise`<[`InvitationDescriptor`](InvitationDescriptor.md)\>

Executes a 'CLAIM' command for an offline invitation.  If successful, the Party member's device will begin
interactive Greeting, with a new invitation and swarm key which will be provided to the claimant.
Those will be returned in the form of an InvitationDescriptor.

#### Returns

`Promise`<[`InvitationDescriptor`](InvitationDescriptor.md)\>

#### Defined in

[packages/echo/echo-db/src/invitations/halo-recovery-initiator.ts:100](https://github.com/dxos/dxos/blob/6b1348fed/packages/echo/echo-db/src/invitations/halo-recovery-initiator.ts#L100)

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

[packages/echo/echo-db/src/invitations/halo-recovery-initiator.ts:66](https://github.com/dxos/dxos/blob/6b1348fed/packages/echo/echo-db/src/invitations/halo-recovery-initiator.ts#L66)

___

### createSecretProvider

▸ **createSecretProvider**(): `SecretProvider`

#### Returns

`SecretProvider`

#### Defined in

[packages/echo/echo-db/src/invitations/halo-recovery-initiator.ts:146](https://github.com/dxos/dxos/blob/6b1348fed/packages/echo/echo-db/src/invitations/halo-recovery-initiator.ts#L146)

___

### destroy

▸ **destroy**(): `Promise`<`void`\>

#### Returns

`Promise`<`void`\>

#### Defined in

[packages/echo/echo-db/src/invitations/halo-recovery-initiator.ts:138](https://github.com/dxos/dxos/blob/6b1348fed/packages/echo/echo-db/src/invitations/halo-recovery-initiator.ts#L138)

___

### disconnect

▸ **disconnect**(): `Promise`<`void`\>

#### Returns

`Promise`<`void`\>

#### Defined in

[packages/echo/echo-db/src/invitations/halo-recovery-initiator.ts:132](https://github.com/dxos/dxos/blob/6b1348fed/packages/echo/echo-db/src/invitations/halo-recovery-initiator.ts#L132)

___

### createHaloInvitationClaimHandler

▸ `Static` **createHaloInvitationClaimHandler**(`identityKey`, `invitationManager`): (`message`: `any`, `remotePeerId`: `Buffer`, `peerId`: `Buffer`) => `Promise`<`WithTypeUrl`<`ClaimResponse`\>\>

#### Parameters

| Name | Type |
| :------ | :------ |
| `identityKey` | `PublicKey` |
| `invitationManager` | [`InvitationFactory`](InvitationFactory.md) |

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

[packages/echo/echo-db/src/invitations/halo-recovery-initiator.ts:161](https://github.com/dxos/dxos/blob/6b1348fed/packages/echo/echo-db/src/invitations/halo-recovery-initiator.ts#L161)
