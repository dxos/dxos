# Class `SpaceInvitationsProxy`
Declared in [`packages/sdk/client-services/src/packlets/invitations/space-invitations-proxy.ts:12`](https://github.com/dxos/protocols/blob/main/packages/sdk/client-services/src/packlets/invitations/space-invitations-proxy.ts#L12)


Adapts invitation service observable to client/service stream.

## Constructors
### [`constructor`](https://github.com/dxos/protocols/blob/main/packages/sdk/client-services/src/packlets/invitations/invitations-proxy.ts#L31)


Returns: [`SpaceInvitationsProxy`](/api/@dxos/client-services/classes/SpaceInvitationsProxy)

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

`context`: `PublicKey`

`options`: [`InvitationsOptions`](/api/@dxos/client-services/types/InvitationsOptions)
### [`getInvitationOptions`](https://github.com/dxos/protocols/blob/main/packages/sdk/client-services/src/packlets/invitations/space-invitations-proxy.ts#L13)


Returns: `object`

Arguments: 

`context`: `PublicKey`