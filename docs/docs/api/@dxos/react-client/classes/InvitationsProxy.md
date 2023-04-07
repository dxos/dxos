# Class `InvitationsProxy`
<sub>Declared in [packages/sdk/client/dist/types/src/packlets/invitations/invitations-proxy.d.ts:3]()</sub>





## Constructors
### [constructor(_invitationsService, _getContext)]()



Returns: <code>[InvitationsProxy](/api/@dxos/react-client/classes/InvitationsProxy)</code>

Arguments: 

`_invitationsService`: <code>InvitationsService</code>

`_getContext`: <code>function</code>


## Properties


## Methods
### [acceptInvitation(invitation)]()



Returns: <code>[AuthenticatingInvitationObservable](/api/@dxos/react-client/classes/AuthenticatingInvitationObservable)</code>

Arguments: 

`invitation`: <code>[Invitation](/api/@dxos/react-client/interfaces/Invitation)</code>

### [createInvitation(\[options\])]()



Returns: <code>[CancellableInvitationObservable](/api/@dxos/react-client/classes/CancellableInvitationObservable)</code>

Arguments: 

`options`: <code>Partial&lt;[Invitation](/api/@dxos/react-client/interfaces/Invitation)&gt;</code>

### [getInvitationOptions()]()



Returns: <code>[Invitation](/api/@dxos/react-client/interfaces/Invitation)</code>

Arguments: none
