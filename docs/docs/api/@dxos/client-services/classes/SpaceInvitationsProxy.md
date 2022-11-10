# Class `SpaceInvitationsProxy`
Declared in [`packages/sdk/client-services/src/packlets/invitations/space-invitations-proxy.ts:12`](https://github.com/dxos/protocols/blob/main/packages/sdk/client-services/src/packlets/invitations/space-invitations-proxy.ts#L12)


Adapts invitation service observable to client/service stream.

## Constructors
### [`constructor`](https://github.com/dxos/protocols/blob/main/packages/sdk/client-services/src/packlets/invitations/invitations-proxy.ts#L27)


Returns: [`SpaceInvitationsProxy`](/api/@dxos/client-services/classes/SpaceInvitationsProxy)

Arguments: 

`_invitationsService`: `InvitationsService`

## Properties


## Methods
### [`acceptInvitation`](https://github.com/dxos/protocols/blob/main/packages/sdk/client-services/src/packlets/invitations/invitations-proxy.ts#L94)


Returns: [`AuthenticatingInvitationObservable`](/api/@dxos/client-services/interfaces/AuthenticatingInvitationObservable)

Arguments: 

`invitation`: `Invitation`
### [`createInvitation`](https://github.com/dxos/protocols/blob/main/packages/sdk/client-services/src/packlets/invitations/invitations-proxy.ts#L34)


Returns: [`InvitationObservable`](/api/@dxos/client-services/interfaces/InvitationObservable)

Arguments: 

`context`: `PublicKey`

`options`: [`CreateInvitationsOptions`](/api/@dxos/client-services/types/CreateInvitationsOptions)
### [`createInvitationObject`](https://github.com/dxos/protocols/blob/main/packages/sdk/client-services/src/packlets/invitations/space-invitations-proxy.ts#L13)


Returns: `object`

Arguments: 

`spaceKey`: `PublicKey`