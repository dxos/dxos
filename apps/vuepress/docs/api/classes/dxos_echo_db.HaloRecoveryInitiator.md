# Class: HaloRecoveryInitiator

[@dxos/echo-db](../modules/dxos_echo_db.md).HaloRecoveryInitiator

Class to facilitate making a unsolicited connections to an existing HALO Party to ask for entrance.
If successful, regular Greeting will follow authenticated by the Identity key (usually recovered from
seed phrase).

TODO(telackey): DoS mitigation

## Table of contents

### Constructors

- [constructor](dxos_echo_db.HaloRecoveryInitiator.md#constructor)

### Properties

- [\_greeterPlugin](dxos_echo_db.HaloRecoveryInitiator.md#_greeterplugin)
- [\_peerId](dxos_echo_db.HaloRecoveryInitiator.md#_peerid)
- [\_state](dxos_echo_db.HaloRecoveryInitiator.md#_state)

### Accessors

- [state](dxos_echo_db.HaloRecoveryInitiator.md#state)

### Methods

- [claim](dxos_echo_db.HaloRecoveryInitiator.md#claim)
- [connect](dxos_echo_db.HaloRecoveryInitiator.md#connect)
- [createSecretProvider](dxos_echo_db.HaloRecoveryInitiator.md#createsecretprovider)
- [destroy](dxos_echo_db.HaloRecoveryInitiator.md#destroy)
- [disconnect](dxos_echo_db.HaloRecoveryInitiator.md#disconnect)
- [createHaloInvitationClaimHandler](dxos_echo_db.HaloRecoveryInitiator.md#createhaloinvitationclaimhandler)

## Constructors

### constructor

• **new HaloRecoveryInitiator**(`_networkManager`, `_credentialsSigner`)

#### Parameters

| Name | Type |
| :------ | :------ |
| `_networkManager` | `NetworkManager` |
| `_credentialsSigner` | [`CredentialsSigner`](dxos_echo_db.CredentialsSigner.md) |

#### Defined in

[packages/echo/echo-db/src/invitations/halo-recovery-initiator.ts:51](https://github.com/dxos/dxos/blob/e3b936721/packages/echo/echo-db/src/invitations/halo-recovery-initiator.ts#L51)

## Properties

### \_greeterPlugin

• `Optional` **\_greeterPlugin**: `GreetingCommandPlugin`

#### Defined in

[packages/echo/echo-db/src/invitations/halo-recovery-initiator.ts:48](https://github.com/dxos/dxos/blob/e3b936721/packages/echo/echo-db/src/invitations/halo-recovery-initiator.ts#L48)

___

### \_peerId

• `Optional` **\_peerId**: `Buffer`

#### Defined in

[packages/echo/echo-db/src/invitations/halo-recovery-initiator.ts:49](https://github.com/dxos/dxos/blob/e3b936721/packages/echo/echo-db/src/invitations/halo-recovery-initiator.ts#L49)

___

### \_state

• **\_state**: [`GreetingState`](../enums/dxos_echo_db.GreetingState.md)

#### Defined in

[packages/echo/echo-db/src/invitations/halo-recovery-initiator.ts:47](https://github.com/dxos/dxos/blob/e3b936721/packages/echo/echo-db/src/invitations/halo-recovery-initiator.ts#L47)

## Accessors

### state

• `get` **state**(): [`GreetingState`](../enums/dxos_echo_db.GreetingState.md)

#### Returns

[`GreetingState`](../enums/dxos_echo_db.GreetingState.md)

#### Defined in

[packages/echo/echo-db/src/invitations/halo-recovery-initiator.ts:58](https://github.com/dxos/dxos/blob/e3b936721/packages/echo/echo-db/src/invitations/halo-recovery-initiator.ts#L58)

## Methods

### claim

▸ **claim**(): `Promise`<[`InvitationDescriptor`](dxos_echo_db.InvitationDescriptor.md)\>

Executes a 'CLAIM' command for an offline invitation.  If successful, the Party member's device will begin
interactive Greeting, with a new invitation and swarm key which will be provided to the claimant.
Those will be returned in the form of an InvitationDescriptor.

#### Returns

`Promise`<[`InvitationDescriptor`](dxos_echo_db.InvitationDescriptor.md)\>

#### Defined in

[packages/echo/echo-db/src/invitations/halo-recovery-initiator.ts:100](https://github.com/dxos/dxos/blob/e3b936721/packages/echo/echo-db/src/invitations/halo-recovery-initiator.ts#L100)

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

[packages/echo/echo-db/src/invitations/halo-recovery-initiator.ts:66](https://github.com/dxos/dxos/blob/e3b936721/packages/echo/echo-db/src/invitations/halo-recovery-initiator.ts#L66)

___

### createSecretProvider

▸ **createSecretProvider**(): `SecretProvider`

#### Returns

`SecretProvider`

#### Defined in

[packages/echo/echo-db/src/invitations/halo-recovery-initiator.ts:146](https://github.com/dxos/dxos/blob/e3b936721/packages/echo/echo-db/src/invitations/halo-recovery-initiator.ts#L146)

___

### destroy

▸ **destroy**(): `Promise`<`void`\>

#### Returns

`Promise`<`void`\>

#### Defined in

[packages/echo/echo-db/src/invitations/halo-recovery-initiator.ts:138](https://github.com/dxos/dxos/blob/e3b936721/packages/echo/echo-db/src/invitations/halo-recovery-initiator.ts#L138)

___

### disconnect

▸ **disconnect**(): `Promise`<`void`\>

#### Returns

`Promise`<`void`\>

#### Defined in

[packages/echo/echo-db/src/invitations/halo-recovery-initiator.ts:132](https://github.com/dxos/dxos/blob/e3b936721/packages/echo/echo-db/src/invitations/halo-recovery-initiator.ts#L132)

___

### createHaloInvitationClaimHandler

▸ `Static` **createHaloInvitationClaimHandler**(`identityKey`, `invitationManager`): (`message`: `any`, `remotePeerId`: `Buffer`, `peerId`: `Buffer`) => `Promise`<`WithTypeUrl`<`ClaimResponse`\>\>

#### Parameters

| Name | Type |
| :------ | :------ |
| `identityKey` | `PublicKey` |
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

[packages/echo/echo-db/src/invitations/halo-recovery-initiator.ts:161](https://github.com/dxos/dxos/blob/e3b936721/packages/echo/echo-db/src/invitations/halo-recovery-initiator.ts#L161)
