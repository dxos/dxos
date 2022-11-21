# Class `InvitationObservableProvider`
<sub>Declared in [packages/sdk/client-services/src/packlets/invitations/invitations.ts:50](https://github.com/dxos/protocols/blob/main/packages/sdk/client-services/src/packlets/invitations/invitations.ts#L50)</sub>


Base class for all invitation observables and providers.
Observable that supports inspection of the current value.

## Constructors
### [constructor(\[_handleCancel\])]()


Returns: <code>[InvitationObservableProvider](/api/@dxos/client-services/classes/InvitationObservableProvider)</code>

Arguments: 

`_handleCancel`: <code>function</code>

## Properties
### [_handlers]()
Type: <code>[InvitationEvents](/api/@dxos/client-services/interfaces/InvitationEvents)[]</code>
### [callback]()
Type: <code>Events</code>

Proxy used to dispatch callbacks to each subscription.
### [cancelled]()
Type: <code>boolean</code>
### [invitation](https://github.com/dxos/protocols/blob/main/packages/sdk/client-services/src/packlets/invitations/invitations.ts#L56)
Type: <code>undefined | Invitation</code>

## Methods
### [cancel()]()


Returns: <code>Promise&lt;void&gt;</code>

Arguments: none
### [setInvitation(invitation)](https://github.com/dxos/protocols/blob/main/packages/sdk/client-services/src/packlets/invitations/invitations.ts#L60)


Returns: <code>void</code>

Arguments: 

`invitation`: <code>Invitation</code>
### [subscribe(handler)]()


Returns: <code>UnsubscribeCallback</code>

Arguments: 

`handler`: <code>[InvitationEvents](/api/@dxos/client-services/interfaces/InvitationEvents)</code>