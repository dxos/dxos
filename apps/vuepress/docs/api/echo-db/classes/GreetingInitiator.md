# Class: GreetingInitiator

Attempts to connect to a greeting responder to 'redeem' an invitation, potentially with some out-of-band
authentication check, in order to be admitted to a Party.

## Table of contents

### Constructors

- [constructor](GreetingInitiator.md#constructor)

### Properties

- [\_greeterPlugin](GreetingInitiator.md#_greeterplugin)
- [\_state](GreetingInitiator.md#_state)

### Accessors

- [state](GreetingInitiator.md#state)

### Methods

- [connect](GreetingInitiator.md#connect)
- [destroy](GreetingInitiator.md#destroy)
- [disconnect](GreetingInitiator.md#disconnect)
- [redeemInvitation](GreetingInitiator.md#redeeminvitation)

## Constructors

### constructor

• **new GreetingInitiator**(`_networkManager`, `_invitationDescriptor`, `_getMessagesToNotarize`)

#### Parameters

| Name | Type | Description |
| :------ | :------ | :------ |
| `_networkManager` | `NetworkManager` |  |
| `_invitationDescriptor` | [`InvitationDescriptor`](InvitationDescriptor.md) |  |
| `_getMessagesToNotarize` | (`partyKey`: `PublicKey`, `nonce`: `Uint8Array`) => `Promise`<`Message`[]\> | Returns a list of credential messages that the inviter will be asked to write into the control feed. |

#### Defined in

[packages/echo/echo-db/src/invitations/greeting-initiator.ts:59](https://github.com/dxos/dxos/blob/6b1348fed/packages/echo/echo-db/src/invitations/greeting-initiator.ts#L59)

## Properties

### \_greeterPlugin

• `Private` `Optional` **\_greeterPlugin**: `GreetingCommandPlugin`

#### Defined in

[packages/echo/echo-db/src/invitations/greeting-initiator.ts:48](https://github.com/dxos/dxos/blob/6b1348fed/packages/echo/echo-db/src/invitations/greeting-initiator.ts#L48)

___

### \_state

• `Private` **\_state**: [`GreetingState`](../enums/GreetingState.md) = `GreetingState.INITIALIZED`

#### Defined in

[packages/echo/echo-db/src/invitations/greeting-initiator.ts:51](https://github.com/dxos/dxos/blob/6b1348fed/packages/echo/echo-db/src/invitations/greeting-initiator.ts#L51)

## Accessors

### state

• `get` **state**(): [`GreetingState`](../enums/GreetingState.md)

#### Returns

[`GreetingState`](../enums/GreetingState.md)

#### Defined in

[packages/echo/echo-db/src/invitations/greeting-initiator.ts:67](https://github.com/dxos/dxos/blob/6b1348fed/packages/echo/echo-db/src/invitations/greeting-initiator.ts#L67)

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

[packages/echo/echo-db/src/invitations/greeting-initiator.ts:75](https://github.com/dxos/dxos/blob/6b1348fed/packages/echo/echo-db/src/invitations/greeting-initiator.ts#L75)

___

### destroy

▸ **destroy**(): `Promise`<`void`\>

#### Returns

`Promise`<`void`\>

#### Defined in

[packages/echo/echo-db/src/invitations/greeting-initiator.ts:191](https://github.com/dxos/dxos/blob/6b1348fed/packages/echo/echo-db/src/invitations/greeting-initiator.ts#L191)

___

### disconnect

▸ **disconnect**(): `Promise`<`void`\>

#### Returns

`Promise`<`void`\>

#### Defined in

[packages/echo/echo-db/src/invitations/greeting-initiator.ts:185](https://github.com/dxos/dxos/blob/6b1348fed/packages/echo/echo-db/src/invitations/greeting-initiator.ts#L185)

___

### redeemInvitation

▸ **redeemInvitation**(`secretProvider`): `Promise`<[`InvitationResult`](../interfaces/InvitationResult.md)\>

Called after connecting to initiate greeting protocol exchange.

#### Parameters

| Name | Type |
| :------ | :------ |
| `secretProvider` | `SecretProvider` |

#### Returns

`Promise`<[`InvitationResult`](../interfaces/InvitationResult.md)\>

#### Defined in

[packages/echo/echo-db/src/invitations/greeting-initiator.ts:120](https://github.com/dxos/dxos/blob/6b1348fed/packages/echo/echo-db/src/invitations/greeting-initiator.ts#L120)
