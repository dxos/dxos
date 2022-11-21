# Class `HaloInvitationsProxy`
<sub>Declared in [packages/sdk/client-services/src/packlets/invitations/halo-invitations-proxy.ts:10](https://github.com/dxos/protocols/blob/main/packages/sdk/client-services/src/packlets/invitations/halo-invitations-proxy.ts#L10)</sub>


Adapts invitation service observable to client/service stream.

## Constructors
### [constructor(_invitationsService)](https://github.com/dxos/protocols/blob/main/packages/sdk/client-services/src/packlets/invitations/invitations-proxy.ts#L31)


Returns: <code>[HaloInvitationsProxy](/api/@dxos/client-services/classes/HaloInvitationsProxy)</code>

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


Returns: <code>[InvitationObservable](/api/@dxos/client-services/interfaces/InvitationObservable)</code>

Arguments: 

`context`: <code>void</code>

`options`: <code>[InvitationsOptions](/api/@dxos/client-services/types/InvitationsOptions)</code>
### [getInvitationOptions()](https://github.com/dxos/protocols/blob/main/packages/sdk/client-services/src/packlets/invitations/halo-invitations-proxy.ts#L11)


Returns: <code>object</code>

Arguments: none