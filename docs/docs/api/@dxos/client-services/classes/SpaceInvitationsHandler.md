# Class `SpaceInvitationsHandler`
Declared in [`packages/sdk/client-services/src/packlets/invitations/space-invitations-handler.ts:36`](https://github.com/dxos/protocols/blob/main/packages/sdk/client-services/src/packlets/invitations/space-invitations-handler.ts#L36)


Handles the life-cycle of Space invitations between peers.

## Constructors
### [`constructor`](https://github.com/dxos/protocols/blob/main/packages/sdk/client-services/src/packlets/invitations/space-invitations-handler.ts#L37)


Returns: [`SpaceInvitationsHandler`](/api/@dxos/client-services/classes/SpaceInvitationsHandler)

Arguments: 

`_spaceManager`: `SpaceManager`

`_networkManager`: `NetworkManager`

`_signingContext`: `SigningContext`

## Properties


## Methods
### [`acceptInvitation`](https://github.com/dxos/protocols/blob/main/packages/sdk/client-services/src/packlets/invitations/space-invitations-handler.ts#L172)


Waits for the host peer (inviter) to accept our join request.
The local guest peer (invitee) then sends the local space invitation to the host,
which then writes the guest's credentials to the space.

Returns: [`AuthenticatingInvitationProvider`](/api/@dxos/client-services/classes/AuthenticatingInvitationProvider)

Arguments: 

`invitation`: `Invitation`
### [`createInvitation`](https://github.com/dxos/protocols/blob/main/packages/sdk/client-services/src/packlets/invitations/space-invitations-handler.ts#L46)


Creates an invitation and listens for a join request from the invited (guest) peer.

Returns: [`InvitationObservable`](/api/@dxos/client-services/interfaces/InvitationObservable)

Arguments: 

`space`: `Space`

`options`: [`CreateInvitationsOptions`](/api/@dxos/client-services/types/CreateInvitationsOptions)