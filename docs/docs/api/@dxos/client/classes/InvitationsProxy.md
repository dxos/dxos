# Class `InvitationsProxy`
<sub>Declared in [packages/sdk/client/src/packlets/invitations/invitations-proxy.ts:37](https://github.com/dxos/dxos/blob/main/packages/sdk/client/src/packlets/invitations/invitations-proxy.ts#L37)</sub>





## Constructors
### [constructor(_invitationsService, _getContext)](https://github.com/dxos/dxos/blob/main/packages/sdk/client/src/packlets/invitations/invitations-proxy.ts#L39)



Returns: <code>[InvitationsProxy](/api/@dxos/client/classes/InvitationsProxy)</code>

Arguments: 

`_invitationsService`: <code>InvitationsService</code>

`_getContext`: <code>function</code>


## Properties


## Methods
### [acceptInvitation(invitation)](https://github.com/dxos/dxos/blob/main/packages/sdk/client/src/packlets/invitations/invitations-proxy.ts#L70)



Returns: <code>[AuthenticatingInvitationObservable](/api/@dxos/client/classes/AuthenticatingInvitationObservable)</code>

Arguments: 

`invitation`: <code>[Invitation](/api/@dxos/client/interfaces/Invitation)</code>

### [createInvitation(\[options\])](https://github.com/dxos/dxos/blob/main/packages/sdk/client/src/packlets/invitations/invitations-proxy.ts#L55)



Returns: <code>[CancellableInvitationObservable](/api/@dxos/client/classes/CancellableInvitationObservable)</code>

Arguments: 

`options`: <code>Partial&lt;[Invitation](/api/@dxos/client/interfaces/Invitation)&gt;</code>

### [getInvitationOptions()](https://github.com/dxos/dxos/blob/main/packages/sdk/client/src/packlets/invitations/invitations-proxy.ts#L44)



Returns: <code>[Invitation](/api/@dxos/client/interfaces/Invitation)</code>

Arguments: none
