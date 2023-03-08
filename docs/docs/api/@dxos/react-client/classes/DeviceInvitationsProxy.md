# Class `DeviceInvitationsProxy`
<sub>Declared in [packages/sdk/client/dist/types/src/packlets/invitations/device-invitations-proxy.d.ts:5]()</sub>


Adapts invitation service observable to client/service stream.


## Constructors
### [constructor(_invitationsService)]()



Returns: <code>[DeviceInvitationsProxy](/api/@dxos/react-client/classes/DeviceInvitationsProxy)</code>

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

`context`: <code>void</code>

`options`: <code>[InvitationsOptions](/api/@dxos/react-client/types/InvitationsOptions)</code>

### [getInvitationOptions()]()



Returns: <code>object</code>

Arguments: none
