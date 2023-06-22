# Class `HaloProxy`
<sub>Declared in [packages/sdk/client/dist/types/src/packlets/proxies/halo-proxy.d.ts:8]()</sub>


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
Type: <code>MulticastObservable&lt;[CancellableInvitationObservable](/api/@dxos/react-client/classes/CancellableInvitationObservable)[]&gt;</code>

### [opened]()
Type: <code>boolean</code>


## Methods
### [\[custom\]()]()



Returns: <code>string</code>

Arguments: none

### [acceptInvitation(invitation)]()



Initiates accepting invitation.


Returns: <code>[AuthenticatingInvitationObservable](/api/@dxos/react-client/classes/AuthenticatingInvitationObservable)</code>

Arguments: 

`invitation`: <code>[Invitation](/api/@dxos/react-client/interfaces/Invitation)</code>

### [createIdentity(\[profile\])]()



Create Identity.
Then initializes profile with given display name.


Returns: <code>Promise&lt;[Identity](/api/@dxos/react-client/interfaces/Identity)&gt;</code>

Arguments: 

`profile`: <code>ProfileDocument</code>

### [createInvitation(\[options\])]()



Initiates device invitation.


Returns: <code>[CancellableInvitationObservable](/api/@dxos/react-client/classes/CancellableInvitationObservable)</code>

Arguments: 

`options`: <code>Partial&lt;[Invitation](/api/@dxos/react-client/interfaces/Invitation)&gt;</code>

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

### [toJSON()]()



Returns: <code>object</code>

Arguments: none

### [writeCredentials(credentials)]()



Write credentials to halo profile.


Returns: <code>Promise&lt;void&gt;</code>

Arguments: 

`credentials`: <code>Credential[]</code>
