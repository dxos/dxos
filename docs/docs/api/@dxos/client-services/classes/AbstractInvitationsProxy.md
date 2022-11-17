# Class `AbstractInvitationsProxy`
Declared in [`packages/sdk/client-services/src/packlets/invitations/invitations-proxy.ts:29`](https://github.com/dxos/protocols/blob/main/packages/sdk/client-services/src/packlets/invitations/invitations-proxy.ts#L29)


Adapts invitations service observable to client/service stream.
Common base class for HALO and Spaces implementations.

## Constructors
### [`constructor`](https://github.com/dxos/protocols/blob/main/packages/sdk/client-services/src/packlets/invitations/invitations-proxy.ts#L31)


Returns: [`AbstractInvitationsProxy`](/api/@dxos/client-services/classes/AbstractInvitationsProxy)`<T>`

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

`context`: `T`

`options`: [`InvitationsOptions`](/api/@dxos/client-services/types/InvitationsOptions)
### [`getInvitationOptions`](https://github.com/dxos/protocols/blob/main/packages/sdk/client-services/src/packlets/invitations/invitations-proxy.ts#L35)


Returns: `Invitation`

Arguments: 

`context`: `T`