# Class `AbstractInvitationsHandler`
<sub>Declared in [packages/sdk/client/src/packlets/invitations/invitations-handler.ts:60](https://github.com/dxos/dxos/blob/main/packages/sdk/client/src/packlets/invitations/invitations-handler.ts#L60)</sub>


Base class for Halo/Space invitations handlers.


## Constructors
### [constructor(_networkManager)](https://github.com/dxos/dxos/blob/main/packages/sdk/client/src/packlets/invitations/invitations-handler.ts#L62)



Returns: <code>[AbstractInvitationsHandler](/api/@dxos/client/classes/AbstractInvitationsHandler)&lt;T&gt;</code>

Arguments: 

`_networkManager`: <code>NetworkManager</code>


## Properties
### [_networkManager](https://github.com/dxos/dxos/blob/main/packages/sdk/client/src/packlets/invitations/invitations-handler.ts#L63)
Type: <code>NetworkManager</code>


## Methods
### [acceptInvitation(invitation, \[options\])](https://github.com/dxos/dxos/blob/main/packages/sdk/client/src/packlets/invitations/invitations-handler.ts#L67)



Returns: <code>[AuthenticatingInvitationObservable](/api/@dxos/client/interfaces/AuthenticatingInvitationObservable)</code>

Arguments: 

`invitation`: <code>[Invitation](/api/@dxos/client/interfaces/Invitation)</code>

`options`: <code>[InvitationsOptions](/api/@dxos/client/types/InvitationsOptions)</code>

### [createInvitation(context, \[options\])](https://github.com/dxos/dxos/blob/main/packages/sdk/client/src/packlets/invitations/invitations-handler.ts#L66)



Returns: <code>[CancellableInvitationObservable](/api/@dxos/client/interfaces/CancellableInvitationObservable)</code>

Arguments: 

`context`: <code>T</code>

`options`: <code>[InvitationsOptions](/api/@dxos/client/types/InvitationsOptions)</code>
