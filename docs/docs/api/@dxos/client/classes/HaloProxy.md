# Class `HaloProxy`
<sub>Declared in [packages/sdk/client/src/packlets/proxies/halo-proxy.ts:28](https://github.com/dxos/dxos/blob/main/packages/sdk/client/src/packlets/proxies/halo-proxy.ts#L28)</sub>


TODO(burdon): Public API (move comments here).


## Constructors
### [constructor(_serviceProvider)](https://github.com/dxos/dxos/blob/main/packages/sdk/client/src/packlets/proxies/halo-proxy.ts#L47)



Returns: <code>[HaloProxy](/api/@dxos/client/classes/HaloProxy)</code>

Arguments: 

`_serviceProvider`: <code>[ClientServicesProvider](/api/@dxos/client/interfaces/ClientServicesProvider)</code>


## Properties
### [contacts](https://github.com/dxos/dxos/blob/main/packages/sdk/client/src/packlets/proxies/halo-proxy.ts#L77)
Type: <code>MulticastObservable&lt;[Contact](/api/@dxos/client/interfaces/Contact)[]&gt;</code>

### [device](https://github.com/dxos/dxos/blob/main/packages/sdk/client/src/packlets/proxies/halo-proxy.ts#L73)
Type: <code>undefined | Device</code>

### [devices](https://github.com/dxos/dxos/blob/main/packages/sdk/client/src/packlets/proxies/halo-proxy.ts#L69)
Type: <code>MulticastObservable&lt;Device[]&gt;</code>

### [identity](https://github.com/dxos/dxos/blob/main/packages/sdk/client/src/packlets/proxies/halo-proxy.ts#L65)
Type: <code>MulticastObservable&lt;"null" | [Identity](/api/@dxos/client/interfaces/Identity)&gt;</code>

User identity info.

### [invitations](https://github.com/dxos/dxos/blob/main/packages/sdk/client/src/packlets/proxies/halo-proxy.ts#L81)
Type: <code>MulticastObservable&lt;[CancellableInvitationObservable](/api/@dxos/client/classes/CancellableInvitationObservable)[]&gt;</code>

### [opened](https://github.com/dxos/dxos/blob/main/packages/sdk/client/src/packlets/proxies/halo-proxy.ts#L87)
Type: <code>boolean</code>


## Methods
### [\[custom\]()](https://github.com/dxos/dxos/blob/main/packages/sdk/client/src/packlets/proxies/halo-proxy.ts#L51)



Returns: <code>string</code>

Arguments: none

### [acceptInvitation(invitation)](https://github.com/dxos/dxos/blob/main/packages/sdk/client/src/packlets/proxies/halo-proxy.ts#L248)



Initiates accepting invitation.


Returns: <code>[AuthenticatingInvitationObservable](/api/@dxos/client/classes/AuthenticatingInvitationObservable)</code>

Arguments: 

`invitation`: <code>[Invitation](/api/@dxos/client/interfaces/Invitation)</code>

### [createIdentity(profile)](https://github.com/dxos/dxos/blob/main/packages/sdk/client/src/packlets/proxies/halo-proxy.ts#L167)



Create Identity.
Then initializes profile with given display name.


Returns: <code>Promise&lt;[Identity](/api/@dxos/client/interfaces/Identity)&gt;</code>

Arguments: 

`profile`: <code>ProfileDocument</code>

### [createInvitation(\[options\])](https://github.com/dxos/dxos/blob/main/packages/sdk/client/src/packlets/proxies/halo-proxy.ts#L235)



Initiates device invitation.


Returns: <code>[CancellableInvitationObservable](/api/@dxos/client/classes/CancellableInvitationObservable)</code>

Arguments: 

`options`: <code>Partial&lt;[Invitation](/api/@dxos/client/interfaces/Invitation)&gt;</code>

### [presentCredentials(options)](https://github.com/dxos/dxos/blob/main/packages/sdk/client/src/packlets/proxies/halo-proxy.ts#L278)



Present Credentials.


Returns: <code>Promise&lt;Presentation&gt;</code>

Arguments: 

`options`: <code>object</code>

### [queryCredentials(options)](https://github.com/dxos/dxos/blob/main/packages/sdk/client/src/packlets/proxies/halo-proxy.ts#L185)



Get Halo credentials for the current user.


Returns: <code>ObservableProvider&lt;object, Credential[]&gt;</code>

Arguments: 

`options`: <code>object</code>

### [recoverIdentity(recoveryKey)](https://github.com/dxos/dxos/blob/main/packages/sdk/client/src/packlets/proxies/halo-proxy.ts#L174)



Returns: <code>Promise&lt;[Identity](/api/@dxos/client/interfaces/Identity)&gt;</code>

Arguments: 

`recoveryKey`: <code>Uint8Array</code>

### [toJSON()](https://github.com/dxos/dxos/blob/main/packages/sdk/client/src/packlets/proxies/halo-proxy.ts#L55)



Returns: <code>object</code>

Arguments: none

### [writeCredentials(credentials)](https://github.com/dxos/dxos/blob/main/packages/sdk/client/src/packlets/proxies/halo-proxy.ts#L260)



Write credentials to halo profile.


Returns: <code>Promise&lt;void&gt;</code>

Arguments: 

`credentials`: <code>Credential[]</code>
