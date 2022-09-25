# Interface: HandleInvitationRedemptionOpts

[@dxos/client](../modules/dxos_client.md).HandleInvitationRedemptionOpts

## Properties

### invitationDescriptor

 **invitationDescriptor**: [`InvitationDescriptor`](../classes/dxos_client.InvitationDescriptor.md)

#### Defined in

[packages/sdk/client/src/packlets/proxy/invitation-proxy.ts:28](https://github.com/dxos/dxos/blob/db8188dae/packages/sdk/client/src/packlets/proxy/invitation-proxy.ts#L28)

___

### onAuthenticate

 **onAuthenticate**: (`request`: `AuthenticateInvitationRequest`) => `Promise`<`void`\>

#### Type declaration

(`request`): `Promise`<`void`\>

##### Parameters

| Name | Type |
| :------ | :------ |
| `request` | `AuthenticateInvitationRequest` |

##### Returns

`Promise`<`void`\>

#### Defined in

[packages/sdk/client/src/packlets/proxy/invitation-proxy.ts:29](https://github.com/dxos/dxos/blob/db8188dae/packages/sdk/client/src/packlets/proxy/invitation-proxy.ts#L29)

___

### stream

 **stream**: `Stream`<`RedeemedInvitation`\>

#### Defined in

[packages/sdk/client/src/packlets/proxy/invitation-proxy.ts:27](https://github.com/dxos/dxos/blob/db8188dae/packages/sdk/client/src/packlets/proxy/invitation-proxy.ts#L27)
