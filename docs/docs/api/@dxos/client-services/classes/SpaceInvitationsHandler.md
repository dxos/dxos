# Class `SpaceInvitationsHandler`
Declared in [`packages/sdk/client-services/src/packlets/invitations/space-invitations-handler.ts:32`](https://github.com/dxos/protocols/blob/main/packages/sdk/client-services/src/packlets/invitations/space-invitations-handler.ts#L32)


Handles the life-cycle of Space invitations between peers.

## Constructors
### [`constructor`](https://github.com/dxos/protocols/blob/main/packages/sdk/client-services/src/packlets/invitations/space-invitations-handler.ts#L33)


Returns: [`SpaceInvitationsHandler`](/api/@dxos/client-services/classes/SpaceInvitationsHandler)

Arguments: 

`networkManager`: `NetworkManager`

`_spaceManager`: `SpaceManager`

`_signingContext`: `SigningContext`

## Properties
### [`_networkManager`](https://github.com/dxos/protocols/blob/main/packages/sdk/client-services/src/packlets/invitations/invitations-handler.ts#L54)
Type: `NetworkManager`

## Methods
### [`acceptInvitation`](https://github.com/dxos/protocols/blob/main/packages/sdk/client-services/src/packlets/invitations/space-invitations-handler.ts#L170)


Waits for the host peer (inviter) to accept our join request.
The local guest peer (invitee) then sends the local space invitation to the host,
which then writes the guest's credentials to the space.

Returns: [`AuthenticatingInvitationProvider`](/api/@dxos/client-services/classes/AuthenticatingInvitationProvider)

Arguments: 

`invitation`: `Invitation`

`options`: [`InvitationsOptions`](/api/@dxos/client-services/types/InvitationsOptions)
### [`createInvitation`](https://github.com/dxos/protocols/blob/main/packages/sdk/client-services/src/packlets/invitations/space-invitations-handler.ts#L44)


Creates an invitation and listens for a join request from the invited (guest) peer.

Returns: [`InvitationObservable`](/api/@dxos/client-services/interfaces/InvitationObservable)

Arguments: 

`space`: `Space`

`options`: [`InvitationsOptions`](/api/@dxos/client-services/types/InvitationsOptions)