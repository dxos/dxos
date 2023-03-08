# Class `AbstractInvitationsHandler`
<sub>Declared in [packages/sdk/client/dist/types/src/packlets/invitations/invitations-handler.d.ts:50]()</sub>


Base class for Halo/Space invitations handlers.


## Constructors
### [constructor(_networkManager)]()



Returns: <code>[AbstractInvitationsHandler](/api/@dxos/react-client/classes/AbstractInvitationsHandler)&lt;T&gt;</code>

Arguments: 

`_networkManager`: <code>NetworkManager</code>


## Properties
### [_networkManager]()
Type: <code>NetworkManager</code>


## Methods
### [acceptInvitation(invitation, \[options\])]()



Returns: <code>[AuthenticatingInvitationObservable](/api/@dxos/react-client/interfaces/AuthenticatingInvitationObservable)</code>

Arguments: 

`invitation`: <code>[Invitation](/api/@dxos/react-client/interfaces/Invitation)</code>

`options`: <code>[InvitationsOptions](/api/@dxos/react-client/types/InvitationsOptions)</code>

### [createInvitation(context, \[options\])]()



Returns: <code>[CancellableInvitationObservable](/api/@dxos/react-client/interfaces/CancellableInvitationObservable)</code>

Arguments: 

`context`: <code>T</code>

`options`: <code>[InvitationsOptions](/api/@dxos/react-client/types/InvitationsOptions)</code>
