# Class `SpaceInvitationsProxy`
<sub>Declared in [packages/sdk/client-services/src/packlets/invitations/space-invitations-proxy.ts:12](https://github.com/dxos/protocols/blob/main/packages/sdk/client-services/src/packlets/invitations/space-invitations-proxy.ts#L12)</sub>


Adapts invitation service observable to client/service stream.

## Constructors
### [constructor(_invitationsService)](https://github.com/dxos/protocols/blob/main/packages/sdk/client-services/src/packlets/invitations/invitations-proxy.ts#L31)


Returns: <code>[SpaceInvitationsProxy](/api/@dxos/client-services/classes/SpaceInvitationsProxy)</code>

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

`context`: <code>PublicKey</code>

`options`: <code>[InvitationsOptions](/api/@dxos/client-services/types/InvitationsOptions)</code>
### [getInvitationOptions(context)](https://github.com/dxos/protocols/blob/main/packages/sdk/client-services/src/packlets/invitations/space-invitations-proxy.ts#L13)


Returns: <code>object</code>

Arguments: 

`context`: <code>PublicKey</code>