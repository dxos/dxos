# Class `SpaceInvitationsHandler`
<sub>Declared in [packages/sdk/client-services/src/packlets/invitations/space-invitations-handler.ts:33](https://github.com/dxos/protocols/blob/main/packages/sdk/client-services/src/packlets/invitations/space-invitations-handler.ts#L33)</sub>


Handles the life-cycle of Space invitations between peers.

## Constructors
### [constructor(networkManager, _spaceManager, _signingContext)](https://github.com/dxos/protocols/blob/main/packages/sdk/client-services/src/packlets/invitations/space-invitations-handler.ts#L34)


Returns: <code>[SpaceInvitationsHandler](/api/@dxos/client-services/classes/SpaceInvitationsHandler)</code>

Arguments: 

`networkManager`: <code>NetworkManager</code>

`_spaceManager`: <code>SpaceManager</code>

`_signingContext`: <code>SigningContext</code>

## Properties
### [_networkManager](https://github.com/dxos/protocols/blob/main/packages/sdk/client-services/src/packlets/invitations/invitations-handler.ts#L54)
Type: <code>NetworkManager</code>

## Methods
### [acceptInvitation(invitation, \[options\])](https://github.com/dxos/protocols/blob/main/packages/sdk/client-services/src/packlets/invitations/space-invitations-handler.ts#L171)


Waits for the host peer (inviter) to accept our join request.
The local guest peer (invitee) then sends the local space invitation to the host,
which then writes the guest's credentials to the space.

Returns: <code>[AuthenticatingInvitationProvider](/api/@dxos/client-services/classes/AuthenticatingInvitationProvider)</code>

Arguments: 

`invitation`: <code>Invitation</code>

`options`: <code>[InvitationsOptions](/api/@dxos/client-services/types/InvitationsOptions)</code>
### [createInvitation(space, \[options\])](https://github.com/dxos/protocols/blob/main/packages/sdk/client-services/src/packlets/invitations/space-invitations-handler.ts#L45)


Creates an invitation and listens for a join request from the invited (guest) peer.

Returns: <code>[InvitationObservable](/api/@dxos/client-services/interfaces/InvitationObservable)</code>

Arguments: 

`space`: <code>Space</code>

`options`: <code>[InvitationsOptions](/api/@dxos/client-services/types/InvitationsOptions)</code>