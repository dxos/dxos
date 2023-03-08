# Class `SpaceInvitationsProxy`
<sub>Declared in [packages/sdk/client/dist/types/src/packlets/invitations/space-invitations-proxy.d.ts:6]()</sub>


Adapts invitation service observable to client/service stream.


## Constructors
### [constructor(_invitationsService)]()



Returns: <code>[SpaceInvitationsProxy](/api/@dxos/react-client/classes/SpaceInvitationsProxy)</code>

Arguments: 

`_invitationsService`: <code>[InvitationsService](/api/@dxos/react-client/interfaces/InvitationsService)</code>


## Properties


## Methods
### [acceptInvitation(invitation, \[options\])]()



Returns: <code>[AuthenticatingInvitationObservable](/api/@dxos/react-client/interfaces/AuthenticatingInvitationObservable)</code>

Arguments: 

`invitation`: <code>[Invitation](/api/@dxos/react-client/interfaces/Invitation)</code>

`options`: <code>[InvitationsOptions](/api/@dxos/react-client/types/InvitationsOptions)</code>

### [createInvitation(context, \[options\])]()



Returns: <code>[CancellableInvitationObservable](/api/@dxos/react-client/interfaces/CancellableInvitationObservable)</code>

Arguments: 

`context`: <code>[PublicKey](/api/@dxos/react-client/classes/PublicKey)</code>

`options`: <code>[InvitationsOptions](/api/@dxos/react-client/types/InvitationsOptions)</code>

### [getInvitationOptions(context)]()



Returns: <code>object</code>

Arguments: 

`context`: <code>[PublicKey](/api/@dxos/react-client/classes/PublicKey)</code>
