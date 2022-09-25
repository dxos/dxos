# Class: PartyInvitationClaimHandler

[@dxos/credentials](../modules/dxos_credentials.md).PartyInvitationClaimHandler

## Constructors

### constructor

**new PartyInvitationClaimHandler**(`greetingHandler`)

#### Parameters

| Name | Type |
| :------ | :------ |
| `greetingHandler` | [`PartyInvitationGreetingHandler`](../types/dxos_credentials.PartyInvitationGreetingHandler.md) |

#### Defined in

[packages/halo/credentials/src/greet/party-invitation-claim-handler.ts:26](https://github.com/dxos/dxos/blob/db8188dae/packages/halo/credentials/src/greet/party-invitation-claim-handler.ts#L26)

## Properties

### \_greetingHandler

 **\_greetingHandler**: [`PartyInvitationGreetingHandler`](../types/dxos_credentials.PartyInvitationGreetingHandler.md)

#### Defined in

[packages/halo/credentials/src/greet/party-invitation-claim-handler.ts:20](https://github.com/dxos/dxos/blob/db8188dae/packages/halo/credentials/src/greet/party-invitation-claim-handler.ts#L20)

## Methods

### createMessageHandler

**createMessageHandler**(): (`message`: `any`, `remotePeerId`: `Buffer`, `peerId`: `Buffer`) => `Promise`<`WithTypeUrl`<`ClaimResponse`\>\>

#### Returns

`fn`

(`message`, `remotePeerId`, `peerId`): `Promise`<`WithTypeUrl`<`ClaimResponse`\>\>

##### Parameters

| Name | Type |
| :------ | :------ |
| `message` | `any` |
| `remotePeerId` | `Buffer` |
| `peerId` | `Buffer` |

##### Returns

`Promise`<`WithTypeUrl`<`ClaimResponse`\>\>

#### Defined in

[packages/halo/credentials/src/greet/party-invitation-claim-handler.ts:32](https://github.com/dxos/dxos/blob/db8188dae/packages/halo/credentials/src/greet/party-invitation-claim-handler.ts#L32)

___

### handleMessage

**handleMessage**(`message`, `remotePeerId`, `peerId`): `Promise`<`WithTypeUrl`<`ClaimResponse`\>\>

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

[packages/halo/credentials/src/greet/party-invitation-claim-handler.ts:41](https://github.com/dxos/dxos/blob/db8188dae/packages/halo/credentials/src/greet/party-invitation-claim-handler.ts#L41)
