# Class `AbstractInvitationsProxy`
<sub>Declared in [packages/sdk/client-services/src/packlets/invitations/invitations-proxy.ts:29](https://github.com/dxos/protocols/blob/main/packages/sdk/client-services/src/packlets/invitations/invitations-proxy.ts#L29)</sub>


Adapts invitations service observable to client/service stream.
Common base class for HALO and Spaces implementations.

## Constructors
### [constructor(_invitationsService)](https://github.com/dxos/protocols/blob/main/packages/sdk/client-services/src/packlets/invitations/invitations-proxy.ts#L31)


Returns: <code>[AbstractInvitationsProxy](/api/@dxos/client-services/classes/AbstractInvitationsProxy)&lt;T&gt;</code>

Arguments: 

`_invitationsService`: <code>[InvitationsService](/api/@dxos/client-services/interfaces/InvitationsService)</code>

## Properties

## Methods
### [acceptInvitation(invitation, \[options\])](https://github.com/dxos/protocols/blob/main/packages/sdk/client-services/src/packlets/invitations/invitations-proxy.ts#L95)


Returns: <code>[AuthenticatingInvitationObservable](/api/@dxos/client-services/interfaces/AuthenticatingInvitationObservable)</code>

Arguments: 

`invitation`: <code>Invitation</code>

`options`: <code>[InvitationsOptions](/api/@dxos/client-services/types/InvitationsOptions)</code>
### [createInvitation(context, \[options\])](https://github.com/dxos/protocols/blob/main/packages/sdk/client-services/src/packlets/invitations/invitations-proxy.ts#L37)


Returns: <code>[CancellableInvitationObservable](/api/@dxos/client-services/interfaces/CancellableInvitationObservable)</code>

Arguments: 

`context`: <code>T</code>

`options`: <code>[InvitationsOptions](/api/@dxos/client-services/types/InvitationsOptions)</code>
### [getInvitationOptions(context)](https://github.com/dxos/protocols/blob/main/packages/sdk/client-services/src/packlets/invitations/invitations-proxy.ts#L35)


Returns: <code>Invitation</code>

Arguments: 

`context`: <code>T</code>