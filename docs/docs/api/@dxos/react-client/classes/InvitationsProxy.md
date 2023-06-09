# Class `InvitationsProxy`
<sub>Declared in [packages/sdk/client/dist/types/src/packlets/proxies/invitations-proxy.d.ts:4]()</sub>





## Constructors
### [constructor(_invitationsService, _getInvitationContext)]()



Returns: <code>[InvitationsProxy](/api/@dxos/react-client/classes/InvitationsProxy)</code>

Arguments: 

`_invitationsService`: <code>InvitationsService</code>

`_getInvitationContext`: <code>function</code>


## Properties
### [accepted]()
Type: <code>MulticastObservable&lt;[AuthenticatingInvitationObservable](/api/@dxos/react-client/classes/AuthenticatingInvitationObservable)[]&gt;</code>

### [created]()
Type: <code>MulticastObservable&lt;[CancellableInvitationObservable](/api/@dxos/react-client/classes/CancellableInvitationObservable)[]&gt;</code>

### [isOpen]()
Type: <code>boolean</code>


## Methods
### [acceptInvitation(invitation)]()



Returns: <code>[AuthenticatingInvitationObservable](/api/@dxos/react-client/classes/AuthenticatingInvitationObservable)</code>

Arguments: 

`invitation`: <code>[Invitation](/api/@dxos/react-client/interfaces/Invitation)</code>

### [close()]()



Returns: <code>Promise&lt;void&gt;</code>

Arguments: none

### [createInvitation(\[options\])]()



Returns: <code>[CancellableInvitationObservable](/api/@dxos/react-client/classes/CancellableInvitationObservable)</code>

Arguments: 

`options`: <code>Partial&lt;[Invitation](/api/@dxos/react-client/interfaces/Invitation)&gt;</code>

### [getInvitationOptions()]()



Returns: <code>[Invitation](/api/@dxos/react-client/interfaces/Invitation)</code>

Arguments: none

### [open()]()



Returns: <code>Promise&lt;void&gt;</code>

Arguments: none
