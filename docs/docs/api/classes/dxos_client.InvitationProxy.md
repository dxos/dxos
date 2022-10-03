# Class: InvitationProxy

[@dxos/client](../modules/dxos_client.md).InvitationProxy

## Constructors

### constructor

**new InvitationProxy**()

## Properties

### activeInvitations

 `Readonly` **activeInvitations**: [`InvitationRequest`](dxos_client.InvitationRequest.md)[] = `[]`

#### Defined in

[packages/sdk/client/src/packlets/proxy/invitation-proxy.ts:38](https://github.com/dxos/dxos/blob/main/packages/sdk/client/src/packlets/proxy/invitation-proxy.ts#L38)

___

### invitationsUpdate

 `Readonly` **invitationsUpdate**: `Event`<`void`\>

#### Defined in

[packages/sdk/client/src/packlets/proxy/invitation-proxy.ts:39](https://github.com/dxos/dxos/blob/main/packages/sdk/client/src/packlets/proxy/invitation-proxy.ts#L39)

## Methods

### \_removeInvitation

`Protected` **_removeInvitation**(`invitation`): `void`

#### Parameters

| Name | Type |
| :------ | :------ |
| `invitation` | [`InvitationRequest`](dxos_client.InvitationRequest.md) |

#### Returns

`void`

#### Defined in

[packages/sdk/client/src/packlets/proxy/invitation-proxy.ts:88](https://github.com/dxos/dxos/blob/main/packages/sdk/client/src/packlets/proxy/invitation-proxy.ts#L88)

___

### createInvitationRequest

**createInvitationRequest**(`__namedParameters`): `Promise`<[`InvitationRequest`](dxos_client.InvitationRequest.md)\>

#### Parameters

| Name | Type |
| :------ | :------ |
| `__namedParameters` | [`CreateInvitationRequestOpts`](../interfaces/dxos_client.CreateInvitationRequestOpts.md) |

#### Returns

`Promise`<[`InvitationRequest`](dxos_client.InvitationRequest.md)\>

#### Defined in

[packages/sdk/client/src/packlets/proxy/invitation-proxy.ts:41](https://github.com/dxos/dxos/blob/main/packages/sdk/client/src/packlets/proxy/invitation-proxy.ts#L41)

___

### handleInvitationRedemption

`Static` **handleInvitationRedemption**(`__namedParameters`): [`HandleInvitationRedemptionResult`](../interfaces/dxos_client.HandleInvitationRedemptionResult.md)

#### Parameters

| Name | Type |
| :------ | :------ |
| `__namedParameters` | [`HandleInvitationRedemptionOpts`](../interfaces/dxos_client.HandleInvitationRedemptionOpts.md) |

#### Returns

[`HandleInvitationRedemptionResult`](../interfaces/dxos_client.HandleInvitationRedemptionResult.md)

#### Defined in

[packages/sdk/client/src/packlets/proxy/invitation-proxy.ts:94](https://github.com/dxos/dxos/blob/main/packages/sdk/client/src/packlets/proxy/invitation-proxy.ts#L94)
