# Class `InvitationsProxy`
<sub>Declared in [packages/sdk/client/src/invitations/invitations-proxy.ts:50](https://github.com/dxos/dxos/blob/175437b91/packages/sdk/client/src/invitations/invitations-proxy.ts#L50)</sub>




## Constructors
### [constructor(_invitationsService, _identityService, _getInvitationContext)](https://github.com/dxos/dxos/blob/175437b91/packages/sdk/client/src/invitations/invitations-proxy.ts#L64)




Returns: <code>[InvitationsProxy](/api/@dxos/client/classes/InvitationsProxy)</code>

Arguments: 

`_invitationsService`: <code>InvitationsService</code>

`_identityService`: <code>undefined | IdentityService</code>

`_getInvitationContext`: <code>function</code>



## Properties
### [accepted](https://github.com/dxos/dxos/blob/175437b91/packages/sdk/client/src/invitations/invitations-proxy.ts#L74)
Type: <code>MulticastObservable&lt;[AuthenticatingInvitation](/api/@dxos/client/classes/AuthenticatingInvitationObservable)[]&gt;</code>



### [created](https://github.com/dxos/dxos/blob/175437b91/packages/sdk/client/src/invitations/invitations-proxy.ts#L70)
Type: <code>MulticastObservable&lt;[CancellableInvitation](/api/@dxos/client/classes/CancellableInvitationObservable)[]&gt;</code>



### [isOpen](https://github.com/dxos/dxos/blob/175437b91/packages/sdk/client/src/invitations/invitations-proxy.ts#L85)
Type: <code>boolean</code>



### [saved](https://github.com/dxos/dxos/blob/175437b91/packages/sdk/client/src/invitations/invitations-proxy.ts#L81)
Type: <code>MulticastObservable&lt;[Invitation](/api/@dxos/client/interfaces/Invitation)[]&gt;</code>

@test-only


## Methods
### [close()](https://github.com/dxos/dxos/blob/175437b91/packages/sdk/client/src/invitations/invitations-proxy.ts#L157)




Returns: <code>Promise&lt;void&gt;</code>

Arguments: none




### [getInvitationOptions()](https://github.com/dxos/dxos/blob/175437b91/packages/sdk/client/src/invitations/invitations-proxy.ts#L169)




Returns: <code>[Invitation](/api/@dxos/client/interfaces/Invitation)</code>

Arguments: none




### [join(invitation, \[deviceProfile\])](https://github.com/dxos/dxos/blob/175437b91/packages/sdk/client/src/invitations/invitations-proxy.ts#L204)




Returns: <code>[AuthenticatingInvitation](/api/@dxos/client/classes/AuthenticatingInvitationObservable)</code>

Arguments: 

`invitation`: <code>string | [Invitation](/api/@dxos/client/interfaces/Invitation)</code>

`deviceProfile`: <code>DeviceProfileDocument</code>


### [open()](https://github.com/dxos/dxos/blob/175437b91/packages/sdk/client/src/invitations/invitations-proxy.ts#L89)




Returns: <code>Promise&lt;void&gt;</code>

Arguments: none




### [share(\[options\])](https://github.com/dxos/dxos/blob/175437b91/packages/sdk/client/src/invitations/invitations-proxy.ts#L181)




Returns: <code>[CancellableInvitation](/api/@dxos/client/classes/CancellableInvitationObservable)</code>

Arguments: 

`options`: <code>Partial&lt;[Invitation](/api/@dxos/client/interfaces/Invitation)&gt;</code>


