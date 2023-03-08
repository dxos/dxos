# Class `AbstractInvitationsProxy`
<sub>Declared in [packages/sdk/client/dist/types/src/packlets/invitations/invitations-proxy.d.ts:11]()</sub>


Adapts invitations service observable to client/service stream.
Common base class for HALO and Spaces implementations.


## Constructors
### [constructor(_invitationsService)]()



Returns: <code>[AbstractInvitationsProxy](/api/@dxos/react-client/classes/AbstractInvitationsProxy)&lt;T&gt;</code>

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

`context`: <code>T</code>

`options`: <code>[InvitationsOptions](/api/@dxos/react-client/types/InvitationsOptions)</code>

### [getInvitationOptions(context)]()



Returns: <code>[Invitation](/api/@dxos/react-client/interfaces/Invitation)</code>

Arguments: 

`context`: <code>T</code>
