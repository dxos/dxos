# Class `AuthenticatingInvitationProvider`
<sub>Declared in [packages/sdk/client-services/src/packlets/invitations/invitations.ts:76](https://github.com/dxos/protocols/blob/main/packages/sdk/client-services/src/packlets/invitations/invitations.ts#L76)</sub>


Cancelable observer that relays authentication requests.

## Constructors
### [constructor(_actions)](https://github.com/dxos/protocols/blob/main/packages/sdk/client-services/src/packlets/invitations/invitations.ts#L81)


Returns: <code>[AuthenticatingInvitationProvider](/api/@dxos/client-services/classes/AuthenticatingInvitationProvider)</code>

Arguments: 

`_actions`: <code>[AuthenticatingInvitationProviderActions](/api/@dxos/client-services/interfaces/AuthenticatingInvitationProviderActions)</code>

## Properties
### [_handlers]()
Type: <code>Set&lt;[InvitationEvents](/api/@dxos/client-services/interfaces/InvitationEvents)&gt;</code>
### [callback]()
Type: <code>Events</code>

Proxy used to dispatch callbacks to each subscription.
### [cancelled]()
Type: <code>boolean</code>
### [invitation](https://github.com/dxos/protocols/blob/main/packages/sdk/client-services/src/packlets/invitations/invitations.ts#L55)
Type: <code>undefined | Invitation</code>

## Methods
### [authenticate(authenticationCode)](https://github.com/dxos/protocols/blob/main/packages/sdk/client-services/src/packlets/invitations/invitations.ts#L87)


Returns: <code>Promise&lt;void&gt;</code>

Arguments: 

`authenticationCode`: <code>string</code>
### [cancel()]()


Returns: <code>Promise&lt;void&gt;</code>

Arguments: none
### [setInvitation(invitation)](https://github.com/dxos/protocols/blob/main/packages/sdk/client-services/src/packlets/invitations/invitations.ts#L59)


Returns: <code>void</code>

Arguments: 

`invitation`: <code>Invitation</code>
### [subscribe(handler)]()


Returns: <code>UnsubscribeCallback</code>

Arguments: 

`handler`: <code>[InvitationEvents](/api/@dxos/client-services/interfaces/InvitationEvents)</code>