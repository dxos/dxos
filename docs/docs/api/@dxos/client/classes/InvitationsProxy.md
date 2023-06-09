# Class `InvitationsProxy`
<sub>Declared in [packages/sdk/client/src/packlets/proxies/invitations-proxy.ts:42](https://github.com/dxos/dxos/blob/main/packages/sdk/client/src/packlets/proxies/invitations-proxy.ts#L42)</sub>





## Constructors
### [constructor(_invitationsService, _getInvitationContext)](https://github.com/dxos/dxos/blob/main/packages/sdk/client/src/packlets/proxies/invitations-proxy.ts#L54)



Returns: <code>[InvitationsProxy](/api/@dxos/client/classes/InvitationsProxy)</code>

Arguments: 

`_invitationsService`: <code>InvitationsService</code>

`_getInvitationContext`: <code>function</code>


## Properties
### [accepted](https://github.com/dxos/dxos/blob/main/packages/sdk/client/src/packlets/proxies/invitations-proxy.ts#L63)
Type: <code>MulticastObservable&lt;[AuthenticatingInvitationObservable](/api/@dxos/client/classes/AuthenticatingInvitationObservable)[]&gt;</code>

### [created](https://github.com/dxos/dxos/blob/main/packages/sdk/client/src/packlets/proxies/invitations-proxy.ts#L59)
Type: <code>MulticastObservable&lt;[CancellableInvitationObservable](/api/@dxos/client/classes/CancellableInvitationObservable)[]&gt;</code>

### [isOpen](https://github.com/dxos/dxos/blob/main/packages/sdk/client/src/packlets/proxies/invitations-proxy.ts#L67)
Type: <code>boolean</code>


## Methods
### [acceptInvitation(invitation)](https://github.com/dxos/dxos/blob/main/packages/sdk/client/src/packlets/proxies/invitations-proxy.ts#L158)



Returns: <code>[AuthenticatingInvitationObservable](/api/@dxos/client/classes/AuthenticatingInvitationObservable)</code>

Arguments: 

`invitation`: <code>[Invitation](/api/@dxos/client/interfaces/Invitation)</code>

### [close()](https://github.com/dxos/dxos/blob/main/packages/sdk/client/src/packlets/proxies/invitations-proxy.ts#L112)



Returns: <code>Promise&lt;void&gt;</code>

Arguments: none

### [createInvitation(\[options\])](https://github.com/dxos/dxos/blob/main/packages/sdk/client/src/packlets/proxies/invitations-proxy.ts#L135)



Returns: <code>[CancellableInvitationObservable](/api/@dxos/client/classes/CancellableInvitationObservable)</code>

Arguments: 

`options`: <code>Partial&lt;[Invitation](/api/@dxos/client/interfaces/Invitation)&gt;</code>

### [getInvitationOptions()](https://github.com/dxos/dxos/blob/main/packages/sdk/client/src/packlets/proxies/invitations-proxy.ts#L124)



Returns: <code>[Invitation](/api/@dxos/client/interfaces/Invitation)</code>

Arguments: none

### [open()](https://github.com/dxos/dxos/blob/main/packages/sdk/client/src/packlets/proxies/invitations-proxy.ts#L71)



Returns: <code>Promise&lt;void&gt;</code>

Arguments: none
