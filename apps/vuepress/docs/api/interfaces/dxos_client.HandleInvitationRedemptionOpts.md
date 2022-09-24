# Interface: HandleInvitationRedemptionOpts

[@dxos/client](../modules/dxos_client.md).HandleInvitationRedemptionOpts

## Table of contents

### Properties

- [invitationDescriptor](dxos_client.HandleInvitationRedemptionOpts.md#invitationdescriptor)
- [onAuthenticate](dxos_client.HandleInvitationRedemptionOpts.md#onauthenticate)
- [stream](dxos_client.HandleInvitationRedemptionOpts.md#stream)

## Properties

### invitationDescriptor

• **invitationDescriptor**: [`InvitationDescriptor`](../classes/dxos_client.InvitationDescriptor.md)

#### Defined in

[packages/sdk/client/src/packlets/proxy/invitation-proxy.ts:28](https://github.com/dxos/dxos/blob/32ae9b579/packages/sdk/client/src/packlets/proxy/invitation-proxy.ts#L28)

___

### onAuthenticate

• **onAuthenticate**: (`request`: `AuthenticateInvitationRequest`) => `Promise`<`void`\>

#### Type declaration

▸ (`request`): `Promise`<`void`\>

##### Parameters

| Name | Type |
| :------ | :------ |
| `request` | `AuthenticateInvitationRequest` |

##### Returns

`Promise`<`void`\>

#### Defined in

[packages/sdk/client/src/packlets/proxy/invitation-proxy.ts:29](https://github.com/dxos/dxos/blob/32ae9b579/packages/sdk/client/src/packlets/proxy/invitation-proxy.ts#L29)

___

### stream

• **stream**: `Stream`<`RedeemedInvitation`\>

#### Defined in

[packages/sdk/client/src/packlets/proxy/invitation-proxy.ts:27](https://github.com/dxos/dxos/blob/32ae9b579/packages/sdk/client/src/packlets/proxy/invitation-proxy.ts#L27)
