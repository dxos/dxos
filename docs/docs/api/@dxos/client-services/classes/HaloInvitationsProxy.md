# Class `HaloInvitationsProxy`
Declared in [`packages/sdk/client-services/src/packlets/invitations/halo-invitations-proxy.ts:10`](https://github.com/dxos/protocols/blob/main/packages/sdk/client-services/src/packlets/invitations/halo-invitations-proxy.ts#L10)


Adapts invitation service observable to client/service stream.

## Constructors
### [`constructor`](https://github.com/dxos/protocols/blob/main/packages/sdk/client-services/src/packlets/invitations/invitations-proxy.ts#L31)


Returns: [`HaloInvitationsProxy`](/api/@dxos/client-services/classes/HaloInvitationsProxy)

Arguments: 

`_invitationsService`: [`InvitationsService`](/api/@dxos/client-services/interfaces/InvitationsService)

## Properties


## Methods
### [`acceptInvitation`](https://github.com/dxos/protocols/blob/main/packages/sdk/client-services/src/packlets/invitations/invitations-proxy.ts#L95)


Returns: [`AuthenticatingInvitationObservable`](/api/@dxos/client-services/interfaces/AuthenticatingInvitationObservable)

Arguments: 

`invitation`: `Invitation`

`options`: [`InvitationsOptions`](/api/@dxos/client-services/types/InvitationsOptions)
### [`createInvitation`](https://github.com/dxos/protocols/blob/main/packages/sdk/client-services/src/packlets/invitations/invitations-proxy.ts#L37)


Returns: [`InvitationObservable`](/api/@dxos/client-services/interfaces/InvitationObservable)

Arguments: 

`context`: `void`

`options`: [`InvitationsOptions`](/api/@dxos/client-services/types/InvitationsOptions)
### [`getInvitationOptions`](https://github.com/dxos/protocols/blob/main/packages/sdk/client-services/src/packlets/invitations/halo-invitations-proxy.ts#L11)


Returns: `object`

Arguments: none