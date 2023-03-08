# Class `AuthenticatingInvitationProvider`
<sub>Declared in [packages/sdk/client/dist/types/src/packlets/invitations/invitations.d.ts:44]()</sub>


Cancelable observer that relays authentication requests.


## Constructors
### [constructor(_actions)]()



Returns: <code>[AuthenticatingInvitationProvider](/api/@dxos/react-client/classes/AuthenticatingInvitationProvider)</code>

Arguments: 

`_actions`: <code>[AuthenticatingInvitationProviderActions](/api/@dxos/react-client/interfaces/AuthenticatingInvitationProviderActions)</code>


## Properties
### [_handlers]()
Type: <code>Set&lt;[InvitationEvents](/api/@dxos/react-client/interfaces/InvitationEvents)&gt;</code>

### [callback]()
Type: <code>Events</code>

Proxy used to dispatch callbacks to each subscription.

### [cancelled]()
Type: <code>boolean</code>

### [invitation]()
Type: <code>undefined | [Invitation](/api/@dxos/react-client/interfaces/Invitation)</code>

### [value]()
Type: <code>undefined | Value</code>


## Methods
### [authenticate(authenticationCode)]()



Returns: <code>Promise&lt;void&gt;</code>

Arguments: 

`authenticationCode`: <code>string</code>

### [cancel()]()



Returns: <code>Promise&lt;void&gt;</code>

Arguments: none

### [setInvitation(invitation)]()



Returns: <code>void</code>

Arguments: 

`invitation`: <code>[Invitation](/api/@dxos/react-client/interfaces/Invitation)</code>

### [setValue(value)]()



Returns: <code>void</code>

Arguments: 

`value`: <code>unknown</code>

### [subscribe(handler)]()



Returns: <code>UnsubscribeCallback</code>

Arguments: 

`handler`: <code>[InvitationEvents](/api/@dxos/react-client/interfaces/InvitationEvents)</code>
