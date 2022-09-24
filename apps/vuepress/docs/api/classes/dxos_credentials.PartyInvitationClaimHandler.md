# Class: PartyInvitationClaimHandler

[@dxos/credentials](../modules/dxos_credentials.md).PartyInvitationClaimHandler

## Table of contents

### Constructors

- [constructor](dxos_credentials.PartyInvitationClaimHandler.md#constructor)

### Properties

- [\_greetingHandler](dxos_credentials.PartyInvitationClaimHandler.md#_greetinghandler)

### Methods

- [createMessageHandler](dxos_credentials.PartyInvitationClaimHandler.md#createmessagehandler)
- [handleMessage](dxos_credentials.PartyInvitationClaimHandler.md#handlemessage)

## Constructors

### constructor

• **new PartyInvitationClaimHandler**(`greetingHandler`)

#### Parameters

| Name | Type |
| :------ | :------ |
| `greetingHandler` | [`PartyInvitationGreetingHandler`](../modules/dxos_credentials.md#partyinvitationgreetinghandler) |

#### Defined in

[packages/halo/credentials/src/greet/party-invitation-claim-handler.ts:26](https://github.com/dxos/dxos/blob/e3b936721/packages/halo/credentials/src/greet/party-invitation-claim-handler.ts#L26)

## Properties

### \_greetingHandler

• **\_greetingHandler**: [`PartyInvitationGreetingHandler`](../modules/dxos_credentials.md#partyinvitationgreetinghandler)

#### Defined in

[packages/halo/credentials/src/greet/party-invitation-claim-handler.ts:20](https://github.com/dxos/dxos/blob/e3b936721/packages/halo/credentials/src/greet/party-invitation-claim-handler.ts#L20)

## Methods

### createMessageHandler

▸ **createMessageHandler**(): (`message`: `any`, `remotePeerId`: `Buffer`, `peerId`: `Buffer`) => `Promise`<`WithTypeUrl`<`ClaimResponse`\>\>

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

[packages/halo/credentials/src/greet/party-invitation-claim-handler.ts:32](https://github.com/dxos/dxos/blob/e3b936721/packages/halo/credentials/src/greet/party-invitation-claim-handler.ts#L32)

___

### handleMessage

▸ **handleMessage**(`message`, `remotePeerId`, `peerId`): `Promise`<`WithTypeUrl`<`ClaimResponse`\>\>

Handle a P2P message from the Extension.

#### Parameters

| Name | Type |
| :------ | :------ |
| `message` | `any` |
| `remotePeerId` | `Buffer` |
| `peerId` | `Buffer` |

#### Returns

`Promise`<`WithTypeUrl`<`ClaimResponse`\>\>

#### Defined in

[packages/halo/credentials/src/greet/party-invitation-claim-handler.ts:41](https://github.com/dxos/dxos/blob/e3b936721/packages/halo/credentials/src/greet/party-invitation-claim-handler.ts#L41)
