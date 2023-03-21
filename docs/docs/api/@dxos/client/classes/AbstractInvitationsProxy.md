# Class `AbstractInvitationsProxy`
<sub>Declared in [packages/sdk/client/src/packlets/invitations/invitations-proxy.ts:29](https://github.com/dxos/dxos/blob/main/packages/sdk/client/src/packlets/invitations/invitations-proxy.ts#L29)</sub>


Adapts invitations service observable to client/service stream.
Common base class for HALO and Spaces implementations.


## Constructors
### [constructor(_invitationsService)](https://github.com/dxos/dxos/blob/main/packages/sdk/client/src/packlets/invitations/invitations-proxy.ts#L31)



Returns: <code>[AbstractInvitationsProxy](/api/@dxos/client/classes/AbstractInvitationsProxy)&lt;T&gt;</code>

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

`context`: <code>T</code>

`options`: <code>[InvitationsOptions](/api/@dxos/client/types/InvitationsOptions)</code>

### [getInvitationOptions(context)](https://github.com/dxos/dxos/blob/main/packages/sdk/client/src/packlets/invitations/invitations-proxy.ts#L35)



Returns: <code>[Invitation](/api/@dxos/client/interfaces/Invitation)</code>

Arguments: 

`context`: <code>T</code>
