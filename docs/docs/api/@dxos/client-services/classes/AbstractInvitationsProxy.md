# Class `AbstractInvitationsProxy`
Declared in [`packages/sdk/client-services/src/packlets/invitations/invitations-proxy.ts:25`](https://github.com/dxos/protocols/blob/main/packages/sdk/client-services/src/packlets/invitations/invitations-proxy.ts#L25)


Adapts invitations service observable to client/service stream.
Used by both HALO and Spaces client/service interfaces.

## Constructors
### [`constructor`](https://github.com/dxos/protocols/blob/main/packages/sdk/client-services/src/packlets/invitations/invitations-proxy.ts#L27)


Returns: [`AbstractInvitationsProxy`](/api/@dxos/client-services/classes/AbstractInvitationsProxy)`<T>`

Arguments: 

`_invitationsService`: `InvitationsService`

## Properties


## Methods
### [`acceptInvitation`](https://github.com/dxos/protocols/blob/main/packages/sdk/client-services/src/packlets/invitations/invitations-proxy.ts#L93)


Returns: [`AuthenticatingInvitationObservable`](/api/@dxos/client-services/interfaces/AuthenticatingInvitationObservable)

Arguments: 

`invitation`: `Invitation`
### [`createInvitation`](https://github.com/dxos/protocols/blob/main/packages/sdk/client-services/src/packlets/invitations/invitations-proxy.ts#L33)


Returns: [`InvitationObservable`](/api/@dxos/client-services/interfaces/InvitationObservable)

Arguments: 

`context`: `T`

`options`: [`CreateInvitationsOptions`](/api/@dxos/client-services/types/CreateInvitationsOptions)
### [`createInvitationObject`](https://github.com/dxos/protocols/blob/main/packages/sdk/client-services/src/packlets/invitations/invitations-proxy.ts#L31)


Returns: `Invitation`

Arguments: 

`context`: `T`