# Class `AbstractInvitationsHandler`
Declared in [`packages/sdk/client-services/src/packlets/invitations/invitations-handler.ts:51`](https://github.com/dxos/protocols/blob/main/packages/sdk/client-services/src/packlets/invitations/invitations-handler.ts#L51)


Base class for Halo/Space invitations handlers.

## Constructors
### [`constructor`](https://github.com/dxos/protocols/blob/main/packages/sdk/client-services/src/packlets/invitations/invitations-handler.ts#L53)


Returns: [`AbstractInvitationsHandler`](/api/@dxos/client-services/classes/AbstractInvitationsHandler)`<T>`

Arguments: 

`_networkManager`: `NetworkManager`

## Properties
### [`_networkManager`](https://github.com/dxos/protocols/blob/main/packages/sdk/client-services/src/packlets/invitations/invitations-handler.ts#L54)
Type: `NetworkManager`

## Methods
### [`acceptInvitation`](https://github.com/dxos/protocols/blob/main/packages/sdk/client-services/src/packlets/invitations/invitations-handler.ts#L58)


Returns: [`AuthenticatingInvitationObservable`](/api/@dxos/client-services/interfaces/AuthenticatingInvitationObservable)

Arguments: 

`invitation`: `Invitation`

`options`: [`InvitationsOptions`](/api/@dxos/client-services/types/InvitationsOptions)
### [`createInvitation`](https://github.com/dxos/protocols/blob/main/packages/sdk/client-services/src/packlets/invitations/invitations-handler.ts#L57)


Returns: [`InvitationObservable`](/api/@dxos/client-services/interfaces/InvitationObservable)

Arguments: 

`context`: `T`

`options`: [`InvitationsOptions`](/api/@dxos/client-services/types/InvitationsOptions)