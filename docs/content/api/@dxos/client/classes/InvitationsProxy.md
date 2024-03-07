# Class `InvitationsProxy`
<sub>Declared in [packages/sdk/client/src/invitations/invitations-proxy.ts:48](https://github.com/dxos/dxos/blob/bfdd5a17b/packages/sdk/client/src/invitations/invitations-proxy.ts#L48)</sub>




## Constructors
### [constructor(_invitationsService, _identityService, _getInvitationContext)](https://github.com/dxos/dxos/blob/bfdd5a17b/packages/sdk/client/src/invitations/invitations-proxy.ts#L59)




Returns: <code>[InvitationsProxy](/api/@dxos/client/classes/InvitationsProxy)</code>

Arguments: 

`_invitationsService`: <code>InvitationsService</code>

`_identityService`: <code>undefined | IdentityService</code>

`_getInvitationContext`: <code>function</code>



## Properties
### [accepted](https://github.com/dxos/dxos/blob/bfdd5a17b/packages/sdk/client/src/invitations/invitations-proxy.ts#L69)
Type: <code>MulticastObservable&lt;[AuthenticatingInvitation](/api/@dxos/client/classes/AuthenticatingInvitationObservable)[]&gt;</code>



### [created](https://github.com/dxos/dxos/blob/bfdd5a17b/packages/sdk/client/src/invitations/invitations-proxy.ts#L65)
Type: <code>MulticastObservable&lt;[CancellableInvitation](/api/@dxos/client/classes/CancellableInvitationObservable)[]&gt;</code>



### [isOpen](https://github.com/dxos/dxos/blob/bfdd5a17b/packages/sdk/client/src/invitations/invitations-proxy.ts#L73)
Type: <code>boolean</code>




## Methods
### [close()](https://github.com/dxos/dxos/blob/bfdd5a17b/packages/sdk/client/src/invitations/invitations-proxy.ts#L116)




Returns: <code>Promise&lt;void&gt;</code>

Arguments: none




### [getInvitationOptions()](https://github.com/dxos/dxos/blob/bfdd5a17b/packages/sdk/client/src/invitations/invitations-proxy.ts#L128)




Returns: <code>[Invitation](/api/@dxos/client/interfaces/Invitation)</code>

Arguments: none




### [join(invitation, \[deviceProfile\])](https://github.com/dxos/dxos/blob/bfdd5a17b/packages/sdk/client/src/invitations/invitations-proxy.ts#L162)




Returns: <code>[AuthenticatingInvitation](/api/@dxos/client/classes/AuthenticatingInvitationObservable)</code>

Arguments: 

`invitation`: <code>string | [Invitation](/api/@dxos/client/interfaces/Invitation)</code>

`deviceProfile`: <code>DeviceProfileDocument</code>


### [open()](https://github.com/dxos/dxos/blob/bfdd5a17b/packages/sdk/client/src/invitations/invitations-proxy.ts#L77)




Returns: <code>Promise&lt;void&gt;</code>

Arguments: none




### [share(\[options\])](https://github.com/dxos/dxos/blob/bfdd5a17b/packages/sdk/client/src/invitations/invitations-proxy.ts#L139)




Returns: <code>[CancellableInvitation](/api/@dxos/client/classes/CancellableInvitationObservable)</code>

Arguments: 

`options`: <code>Partial&lt;[Invitation](/api/@dxos/client/interfaces/Invitation)&gt;</code>


