# Class `InvitationObservableProvider`
Declared in [`packages/sdk/client-services/src/packlets/invitations/invitations.ts:42`](https://github.com/dxos/protocols/blob/main/packages/sdk/client-services/src/packlets/invitations/invitations.ts#L42)


Base class for all invitation observables and providers.
Observable that supports inspection of the current value.

## Constructors
### [`constructor`]()


Returns: [`InvitationObservableProvider`](/api/@dxos/client-services/classes/InvitationObservableProvider)

Arguments: 

`_handleCancel`: `function`

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