# Class `AuthenticatingInvitationProvider`
<sub>Declared in [packages/sdk/client/src/packlets/invitations/invitations.ts:78](https://github.com/dxos/dxos/blob/main/packages/sdk/client/src/packlets/invitations/invitations.ts#L78)</sub>


Cancelable observer that relays authentication requests.


## Constructors
### [constructor(_actions)](https://github.com/dxos/dxos/blob/main/packages/sdk/client/src/packlets/invitations/invitations.ts#L83)



Returns: <code>[AuthenticatingInvitationProvider](/api/@dxos/client/classes/AuthenticatingInvitationProvider)</code>

Arguments: 

`_actions`: <code>[AuthenticatingInvitationProviderActions](/api/@dxos/client/interfaces/AuthenticatingInvitationProviderActions)</code>


## Properties
### [_handlers]()
Type: <code>Set&lt;[InvitationEvents](/api/@dxos/client/interfaces/InvitationEvents)&gt;</code>

### [callback]()
Type: <code>Events</code>

Proxy used to dispatch callbacks to each subscription.

### [cancelled]()
Type: <code>boolean</code>

### [invitation](https://github.com/dxos/dxos/blob/main/packages/sdk/client/src/packlets/invitations/invitations.ts#L57)
Type: <code>undefined | [Invitation](/api/@dxos/client/interfaces/Invitation)</code>

### [value]()
Type: <code>undefined | Value</code>


## Methods
### [authenticate(authenticationCode)](https://github.com/dxos/dxos/blob/main/packages/sdk/client/src/packlets/invitations/invitations.ts#L89)



Returns: <code>Promise&lt;void&gt;</code>

Arguments: 

`authenticationCode`: <code>string</code>

### [cancel()]()



Returns: <code>Promise&lt;void&gt;</code>

Arguments: none

### [setInvitation(invitation)](https://github.com/dxos/dxos/blob/main/packages/sdk/client/src/packlets/invitations/invitations.ts#L61)



Returns: <code>void</code>

Arguments: 

`invitation`: <code>[Invitation](/api/@dxos/client/interfaces/Invitation)</code>

### [setValue(value)]()



Returns: <code>void</code>

Arguments: 

`value`: <code>unknown</code>

### [subscribe(handler)]()



Returns: <code>UnsubscribeCallback</code>

Arguments: 

`handler`: <code>[InvitationEvents](/api/@dxos/client/interfaces/InvitationEvents)</code>
