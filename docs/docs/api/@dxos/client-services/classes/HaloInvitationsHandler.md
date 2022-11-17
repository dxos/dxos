# Class `HaloInvitationsHandler`
Declared in [`packages/sdk/client-services/src/packlets/invitations/halo-invitations-handler.ts:33`](https://github.com/dxos/protocols/blob/main/packages/sdk/client-services/src/packlets/invitations/halo-invitations-handler.ts#L33)


Handles the life-cycle of Halo invitations between peers.

## Constructors
### [`constructor`](https://github.com/dxos/protocols/blob/main/packages/sdk/client-services/src/packlets/invitations/halo-invitations-handler.ts#L35)


Returns: [`HaloInvitationsHandler`](/api/@dxos/client-services/classes/HaloInvitationsHandler)

Arguments: 

`networkManager`: `NetworkManager`

`_identityManager`: [`IdentityManager`](/api/@dxos/client-services/classes/IdentityManager)

## Properties
### [`_networkManager`](https://github.com/dxos/protocols/blob/main/packages/sdk/client-services/src/packlets/invitations/invitations-handler.ts#L54)
Type: `NetworkManager`

## Methods
### [`acceptInvitation`](https://github.com/dxos/protocols/blob/main/packages/sdk/client-services/src/packlets/invitations/halo-invitations-handler.ts#L167)


Waits for the host peer (inviter) to accept our join request.
The local guest peer (invitee) then sends the local halo invitation to the host,
which then writes the guest's credentials to the halo.

Returns: [`AuthenticatingInvitationProvider`](/api/@dxos/client-services/classes/AuthenticatingInvitationProvider)

Arguments: 

`invitation`: `Invitation`

`options`: [`InvitationsOptions`](/api/@dxos/client-services/types/InvitationsOptions)
### [`createInvitation`](https://github.com/dxos/protocols/blob/main/packages/sdk/client-services/src/packlets/invitations/halo-invitations-handler.ts#L45)


Creates an invitation and listens for a join request from the invited (guest) peer.

Returns: [`InvitationObservable`](/api/@dxos/client-services/interfaces/InvitationObservable)

Arguments: 

`context`: `void`

`options`: [`InvitationsOptions`](/api/@dxos/client-services/types/InvitationsOptions)