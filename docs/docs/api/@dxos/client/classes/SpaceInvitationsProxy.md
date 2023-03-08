# Class `SpaceInvitationsProxy`
<sub>Declared in [packages/sdk/client/src/packlets/invitations/space-invitations-proxy.ts:12](https://github.com/dxos/dxos/blob/main/packages/sdk/client/src/packlets/invitations/space-invitations-proxy.ts#L12)</sub>


Adapts invitation service observable to client/service stream.


## Constructors
### [constructor(_invitationsService)](https://github.com/dxos/dxos/blob/main/packages/sdk/client/src/packlets/invitations/invitations-proxy.ts#L31)



Returns: <code>[SpaceInvitationsProxy](/api/@dxos/client/classes/SpaceInvitationsProxy)</code>

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

`context`: <code>[PublicKey](/api/@dxos/client/classes/PublicKey)</code>

`options`: <code>[InvitationsOptions](/api/@dxos/client/types/InvitationsOptions)</code>

### [getInvitationOptions(context)](https://github.com/dxos/dxos/blob/main/packages/sdk/client/src/packlets/invitations/space-invitations-proxy.ts#L13)



Returns: <code>object</code>

Arguments: 

`context`: <code>[PublicKey](/api/@dxos/client/classes/PublicKey)</code>
