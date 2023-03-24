# Class `HaloProxy`
<sub>Declared in [packages/sdk/client/dist/types/src/packlets/proxies/halo-proxy.d.ts:24]()</sub>


TODO(burdon): Public API (move comments here).


## Constructors
### [constructor(_serviceProvider)]()



Returns: <code>[HaloProxy](/api/@dxos/react-client/classes/HaloProxy)</code>

Arguments: 

`_serviceProvider`: <code>[ClientServicesProvider](/api/@dxos/react-client/interfaces/ClientServicesProvider)</code>


## Properties
### [contacts]()
Type: <code>MulticastObservable&lt;[Contact](/api/@dxos/react-client/interfaces/Contact)[]&gt;</code>

### [device]()
Type: <code>undefined | Device</code>

### [devices]()
Type: <code>MulticastObservable&lt;Device[]&gt;</code>

### [identity]()
Type: <code>MulticastObservable&lt;"null" | [Identity](/api/@dxos/react-client/interfaces/Identity)&gt;</code>

User identity info.

### [invitations]()
Type: <code>MulticastObservable&lt;[CancellableInvitationObservable](/api/@dxos/react-client/interfaces/CancellableInvitationObservable)[]&gt;</code>

### [opened]()
Type: <code>boolean</code>


## Methods
### [\[custom\]()]()



Returns: <code>string</code>

Arguments: none

### [acceptInvitation(invitation, \[options\])]()



Initiates accepting invitation.


Returns: <code>[AuthenticatingInvitationObservable](/api/@dxos/react-client/interfaces/AuthenticatingInvitationObservable)</code>

Arguments: 

`invitation`: <code>[Invitation](/api/@dxos/react-client/interfaces/Invitation)</code>

`options`: <code>[InvitationsOptions](/api/@dxos/react-client/types/InvitationsOptions)</code>

### [createIdentity(\[profile\])]()



Create Identity.
Then initializes profile with given display name.


Returns: <code>Promise&lt;[Identity](/api/@dxos/react-client/interfaces/Identity)&gt;</code>

Arguments: 

`profile`: <code>object</code>

### [createInvitation(\[options\])]()



Initiates device invitation.


Returns: <code>[CancellableInvitationObservable](/api/@dxos/react-client/interfaces/CancellableInvitationObservable)</code>

Arguments: 

`options`: <code>[InvitationsOptions](/api/@dxos/react-client/types/InvitationsOptions)</code>

### [presentCredentials(options)]()



Present Credentials.


Returns: <code>Promise&lt;Presentation&gt;</code>

Arguments: 

`options`: <code>object</code>

### [queryCredentials(\[options\])]()



Get Halo credentials for the current user.


Returns: <code>ObservableProvider&lt;object, Credential[]&gt;</code>

Arguments: 

`options`: <code>object</code>

### [recoverIdentity(recoveryKey)]()



Returns: <code>Promise&lt;[Identity](/api/@dxos/react-client/interfaces/Identity)&gt;</code>

Arguments: 

`recoveryKey`: <code>Uint8Array</code>

### [removeInvitation(id)]()



Removes device invitation.


Returns: <code>void</code>

Arguments: 

`id`: <code>string</code>

### [toJSON()]()



Returns: <code>object</code>

Arguments: none

### [writeCredentials(credentials)]()



Write credentials to halo profile.


Returns: <code>Promise&lt;void&gt;</code>

Arguments: 

`credentials`: <code>Credential[]</code>
