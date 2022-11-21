# Class `HaloInvitationsHandler`
<sub>Declared in [packages/sdk/client-services/src/packlets/invitations/halo-invitations-handler.ts:33](https://github.com/dxos/protocols/blob/main/packages/sdk/client-services/src/packlets/invitations/halo-invitations-handler.ts#L33)</sub>


Handles the life-cycle of Halo invitations between peers.

## Constructors
### [constructor(networkManager, _identityManager)](https://github.com/dxos/protocols/blob/main/packages/sdk/client-services/src/packlets/invitations/halo-invitations-handler.ts#L35)


Returns: <code>[HaloInvitationsHandler](/api/@dxos/client-services/classes/HaloInvitationsHandler)</code>

Arguments: 

`networkManager`: <code>NetworkManager</code>

`_identityManager`: <code>[IdentityManager](/api/@dxos/client-services/classes/IdentityManager)</code>

## Properties
### [_networkManager](https://github.com/dxos/protocols/blob/main/packages/sdk/client-services/src/packlets/invitations/invitations-handler.ts#L54)
Type: <code>NetworkManager</code>

## Methods
### [acceptInvitation(invitation, \[options\])](https://github.com/dxos/protocols/blob/main/packages/sdk/client-services/src/packlets/invitations/halo-invitations-handler.ts#L161)


Waits for the host peer (inviter) to accept our join request.
The local guest peer (invitee) then sends the local halo invitation to the host,
which then writes the guest's credentials to the halo.

Returns: <code>[AuthenticatingInvitationProvider](/api/@dxos/client-services/classes/AuthenticatingInvitationProvider)</code>

Arguments: 

`invitation`: <code>Invitation</code>

`options`: <code>[InvitationsOptions](/api/@dxos/client-services/types/InvitationsOptions)</code>
### [createInvitation(context, \[options\])](https://github.com/dxos/protocols/blob/main/packages/sdk/client-services/src/packlets/invitations/halo-invitations-handler.ts#L45)


Creates an invitation and listens for a join request from the invited (guest) peer.

Returns: <code>[InvitationObservable](/api/@dxos/client-services/interfaces/InvitationObservable)</code>

Arguments: 

`context`: <code>void</code>

`options`: <code>[InvitationsOptions](/api/@dxos/client-services/types/InvitationsOptions)</code>