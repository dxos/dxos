# Class: GreetingInitiator

[@dxos/echo-db](../modules/dxos_echo_db.md).GreetingInitiator

Attempts to connect to a greeting responder to 'redeem' an invitation, potentially with some out-of-band
authentication check, in order to be admitted to a Party.

## Table of contents

### Constructors

- [constructor](dxos_echo_db.GreetingInitiator.md#constructor)

### Properties

- [\_greeterPlugin](dxos_echo_db.GreetingInitiator.md#_greeterplugin)
- [\_state](dxos_echo_db.GreetingInitiator.md#_state)

### Accessors

- [state](dxos_echo_db.GreetingInitiator.md#state)

### Methods

- [connect](dxos_echo_db.GreetingInitiator.md#connect)
- [destroy](dxos_echo_db.GreetingInitiator.md#destroy)
- [disconnect](dxos_echo_db.GreetingInitiator.md#disconnect)
- [redeemInvitation](dxos_echo_db.GreetingInitiator.md#redeeminvitation)

## Constructors

### constructor

• **new GreetingInitiator**(`_networkManager`, `_invitationDescriptor`, `_getMessagesToNotarize`)

#### Parameters

| Name | Type | Description |
| :------ | :------ | :------ |
| `_networkManager` | `NetworkManager` |  |
| `_invitationDescriptor` | [`InvitationDescriptor`](dxos_echo_db.InvitationDescriptor.md) |  |
| `_getMessagesToNotarize` | (`partyKey`: `PublicKey`, `nonce`: `Uint8Array`) => `Promise`<`Message`[]\> | Returns a list of credential messages that the inviter will be asked to write into the control feed. |

#### Defined in

[packages/echo/echo-db/src/invitations/greeting-initiator.ts:59](https://github.com/dxos/dxos/blob/32ae9b579/packages/echo/echo-db/src/invitations/greeting-initiator.ts#L59)

## Properties

### \_greeterPlugin

• `Private` `Optional` **\_greeterPlugin**: `GreetingCommandPlugin`

#### Defined in

[packages/echo/echo-db/src/invitations/greeting-initiator.ts:48](https://github.com/dxos/dxos/blob/32ae9b579/packages/echo/echo-db/src/invitations/greeting-initiator.ts#L48)

___

### \_state

• `Private` **\_state**: [`GreetingState`](../enums/dxos_echo_db.GreetingState.md) = `GreetingState.INITIALIZED`

#### Defined in

[packages/echo/echo-db/src/invitations/greeting-initiator.ts:51](https://github.com/dxos/dxos/blob/32ae9b579/packages/echo/echo-db/src/invitations/greeting-initiator.ts#L51)

## Accessors

### state

• `get` **state**(): [`GreetingState`](../enums/dxos_echo_db.GreetingState.md)

#### Returns

[`GreetingState`](../enums/dxos_echo_db.GreetingState.md)

#### Defined in

[packages/echo/echo-db/src/invitations/greeting-initiator.ts:67](https://github.com/dxos/dxos/blob/32ae9b579/packages/echo/echo-db/src/invitations/greeting-initiator.ts#L67)

## Methods

### connect

▸ **connect**(`timeout?`): `Promise`<`void`\>

Initiate a connection to a greeting responder node.

#### Parameters

| Name | Type | Default value | Description |
| :------ | :------ | :------ | :------ |
| `timeout` | `number` | `DEFAULT_TIMEOUT` | Connection timeout (ms). |

#### Returns

`Promise`<`void`\>

#### Defined in

[packages/echo/echo-db/src/invitations/greeting-initiator.ts:75](https://github.com/dxos/dxos/blob/32ae9b579/packages/echo/echo-db/src/invitations/greeting-initiator.ts#L75)

___

### destroy

▸ **destroy**(): `Promise`<`void`\>

#### Returns

`Promise`<`void`\>

#### Defined in

[packages/echo/echo-db/src/invitations/greeting-initiator.ts:191](https://github.com/dxos/dxos/blob/32ae9b579/packages/echo/echo-db/src/invitations/greeting-initiator.ts#L191)

___

### disconnect

▸ **disconnect**(): `Promise`<`void`\>

#### Returns

`Promise`<`void`\>

#### Defined in

[packages/echo/echo-db/src/invitations/greeting-initiator.ts:185](https://github.com/dxos/dxos/blob/32ae9b579/packages/echo/echo-db/src/invitations/greeting-initiator.ts#L185)

___

### redeemInvitation

▸ **redeemInvitation**(`secretProvider`): `Promise`<[`InvitationResult`](../interfaces/dxos_echo_db.InvitationResult.md)\>

Called after connecting to initiate greeting protocol exchange.

#### Parameters

| Name | Type |
| :------ | :------ |
| `secretProvider` | `SecretProvider` |

#### Returns

`Promise`<[`InvitationResult`](../interfaces/dxos_echo_db.InvitationResult.md)\>

#### Defined in

[packages/echo/echo-db/src/invitations/greeting-initiator.ts:120](https://github.com/dxos/dxos/blob/32ae9b579/packages/echo/echo-db/src/invitations/greeting-initiator.ts#L120)
