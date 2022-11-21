# Class `AbstractInvitationsHandler`
<sub>Declared in [packages/sdk/client-services/src/packlets/invitations/invitations-handler.ts:51](https://github.com/dxos/protocols/blob/main/packages/sdk/client-services/src/packlets/invitations/invitations-handler.ts#L51)</sub>


Base class for Halo/Space invitations handlers.

## Constructors
### [constructor(_networkManager)](https://github.com/dxos/protocols/blob/main/packages/sdk/client-services/src/packlets/invitations/invitations-handler.ts#L53)


Returns: <code>[AbstractInvitationsHandler](/api/@dxos/client-services/classes/AbstractInvitationsHandler)&lt;T&gt;</code>

Arguments: 

`_networkManager`: <code>NetworkManager</code>

## Properties
### [_networkManager](https://github.com/dxos/protocols/blob/main/packages/sdk/client-services/src/packlets/invitations/invitations-handler.ts#L54)
Type: <code>NetworkManager</code>

## Methods
### [acceptInvitation(invitation, \[options\])](https://github.com/dxos/protocols/blob/main/packages/sdk/client-services/src/packlets/invitations/invitations-handler.ts#L58)


Returns: <code>[AuthenticatingInvitationObservable](/api/@dxos/client-services/interfaces/AuthenticatingInvitationObservable)</code>

Arguments: 

`invitation`: <code>Invitation</code>

`options`: <code>[InvitationsOptions](/api/@dxos/client-services/types/InvitationsOptions)</code>
### [createInvitation(context, \[options\])](https://github.com/dxos/protocols/blob/main/packages/sdk/client-services/src/packlets/invitations/invitations-handler.ts#L57)


Returns: <code>[InvitationObservable](/api/@dxos/client-services/interfaces/InvitationObservable)</code>

Arguments: 

`context`: <code>T</code>

`options`: <code>[InvitationsOptions](/api/@dxos/client-services/types/InvitationsOptions)</code>