# Class `InvitationsProxy`
<sub>Declared in [packages/sdk/client/dist/types/src/invitations/invitations-proxy.d.ts:5]()</sub>




## Constructors
### [constructor(_invitationsService, _identityService, _getInvitationContext)]()




Returns: <code>[InvitationsProxy](/api/@dxos/react-client/classes/InvitationsProxy)</code>

Arguments: 

`_invitationsService`: <code>InvitationsService</code>

`_identityService`: <code>undefined | IdentityService</code>

`_getInvitationContext`: <code>function</code>



## Properties
### [accepted]()
Type: <code>MulticastObservable&lt;[AuthenticatingInvitation](/api/@dxos/react-client/classes/AuthenticatingInvitationObservable)[]&gt;</code>



### [created]()
Type: <code>MulticastObservable&lt;[CancellableInvitation](/api/@dxos/react-client/classes/CancellableInvitationObservable)[]&gt;</code>



### [isOpen]()
Type: <code>boolean</code>



### [saved]()
Type: <code>MulticastObservable&lt;[Invitation](/api/@dxos/react-client/interfaces/Invitation)[]&gt;</code>

@test-only


## Methods
### [close()]()




Returns: <code>Promise&lt;void&gt;</code>

Arguments: none




### [getInvitationOptions()]()




Returns: <code>[Invitation](/api/@dxos/react-client/interfaces/Invitation)</code>

Arguments: none




### [join(invitation, \[deviceProfile\])]()




Returns: <code>[AuthenticatingInvitation](/api/@dxos/react-client/classes/AuthenticatingInvitationObservable)</code>

Arguments: 

`invitation`: <code>string | [Invitation](/api/@dxos/react-client/interfaces/Invitation)</code>

`deviceProfile`: <code>DeviceProfileDocument</code>


### [open()]()




Returns: <code>Promise&lt;void&gt;</code>

Arguments: none




### [share(\[options\])]()




Returns: <code>[CancellableInvitation](/api/@dxos/react-client/classes/CancellableInvitationObservable)</code>

Arguments: 

`options`: <code>Partial&lt;[Invitation](/api/@dxos/react-client/interfaces/Invitation)&gt;</code>


