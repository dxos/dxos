# Class `InvitationObservableProvider`
<sub>Declared in [packages/sdk/client/src/packlets/invitations/invitations.ts:51](https://github.com/dxos/dxos/blob/main/packages/sdk/client/src/packlets/invitations/invitations.ts#L51)</sub>


Base class for all invitation observables and providers.
Observable that supports inspection of the current value.


## Constructors
### [constructor(\[_handleCancel\])]()



Returns: <code>[InvitationObservableProvider](/api/@dxos/client/classes/InvitationObservableProvider)</code>

Arguments: 

`_handleCancel`: <code>function</code>


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
