# Class `DeviceInvitationsProxy`
<sub>Declared in [packages/sdk/client/src/packlets/invitations/device-invitations-proxy.ts:10](https://github.com/dxos/dxos/blob/main/packages/sdk/client/src/packlets/invitations/device-invitations-proxy.ts#L10)</sub>


Adapts invitation service observable to client/service stream.


## Constructors
### [constructor(_invitationsService)](https://github.com/dxos/dxos/blob/main/packages/sdk/client/src/packlets/invitations/invitations-proxy.ts#L31)



Returns: <code>[DeviceInvitationsProxy](/api/@dxos/client/classes/DeviceInvitationsProxy)</code>

Arguments: 

`_invitationsService`: <code>[InvitationsService](/api/@dxos/client/interfaces/InvitationsService)</code>


## Properties


## Methods
### [acceptInvitation(invitation, \[options\])](https://github.com/dxos/dxos/blob/main/packages/sdk/client/src/packlets/invitations/invitations-proxy.ts#L95)



Returns: <code>[AuthenticatingInvitationObservable](/api/@dxos/client/interfaces/AuthenticatingInvitationObservable)</code>

Arguments: 

`invitation`: <code>[Invitation](/api/@dxos/client/interfaces/Invitation)</code>

`options`: <code>[InvitationsOptions](/api/@dxos/client/types/InvitationsOptions)</code>

### [createInvitation(context, \[options\])](https://github.com/dxos/dxos/blob/main/packages/sdk/client/src/packlets/invitations/invitations-proxy.ts#L37)



Returns: <code>[CancellableInvitationObservable](/api/@dxos/client/interfaces/CancellableInvitationObservable)</code>

Arguments: 

`context`: <code>void</code>

`options`: <code>[InvitationsOptions](/api/@dxos/client/types/InvitationsOptions)</code>

### [getInvitationOptions()](https://github.com/dxos/dxos/blob/main/packages/sdk/client/src/packlets/invitations/device-invitations-proxy.ts#L11)



Returns: <code>object</code>

Arguments: none
