# Class `AuthenticatingInvitationProvider`
Declared in [`packages/sdk/client-services/src/packlets/invitations/invitations.ts:74`](https://github.com/dxos/protocols/blob/main/packages/sdk/client-services/src/packlets/invitations/invitations.ts#L74)


Cancelable observer that relays authentication requests.

## Constructors
### [`constructor`](https://github.com/dxos/protocols/blob/main/packages/sdk/client-services/src/packlets/invitations/invitations.ts#L79)


Returns: [`AuthenticatingInvitationProvider`](/api/@dxos/client-services/classes/AuthenticatingInvitationProvider)

Arguments: 

`_actions`: [`AuthenticatingInvitationProviderActions`](/api/@dxos/client-services/interfaces/AuthenticatingInvitationProviderActions)

## Properties
### [`_handlers`]()
Type: [`InvitationEvents`](/api/@dxos/client-services/interfaces/InvitationEvents)`[]`
### [`callback`]()
Type: `Events`

Proxy used to dispatch callbacks to each subscription.
### [`cancelled`]()
Type: `boolean`
### [`invitation`](https://github.com/dxos/protocols/blob/main/packages/sdk/client-services/src/packlets/invitations/invitations.ts#L48)
Type: `undefined | Invitation`

## Methods
### [`authenticate`](https://github.com/dxos/protocols/blob/main/packages/sdk/client-services/src/packlets/invitations/invitations.ts#L85)


Returns: `Promise<void>`

Arguments: 

`authenticationCode`: `string`
### [`cancel`]()


Returns: `Promise<void>`

Arguments: none
### [`setInvitation`](https://github.com/dxos/protocols/blob/main/packages/sdk/client-services/src/packlets/invitations/invitations.ts#L52)


Returns: `void`

Arguments: 

`invitation`: `Invitation`
### [`subscribe`]()


Returns: `UnsubscribeCallback`

Arguments: 

`handler`: [`InvitationEvents`](/api/@dxos/client-services/interfaces/InvitationEvents)