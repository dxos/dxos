# Class `HaloProxy`
<sub>Declared in [packages/sdk/client/src/packlets/proxies/halo-proxy.ts:53](https://github.com/dxos/dxos/blob/main/packages/sdk/client/src/packlets/proxies/halo-proxy.ts#L53)</sub>


TODO(burdon): Public API (move comments here).


## Constructors
### [constructor(_serviceProvider)](https://github.com/dxos/dxos/blob/main/packages/sdk/client/src/packlets/proxies/halo-proxy.ts#L69)



Returns: <code>[HaloProxy](/api/@dxos/client/classes/HaloProxy)</code>

Arguments: 

`_serviceProvider`: <code>[ClientServicesProvider](/api/@dxos/client/interfaces/ClientServicesProvider)</code>


## Properties
### [contacts](https://github.com/dxos/dxos/blob/main/packages/sdk/client/src/packlets/proxies/halo-proxy.ts#L99)
Type: <code>MulticastObservable&lt;[Contact](/api/@dxos/client/interfaces/Contact)[]&gt;</code>

### [device](https://github.com/dxos/dxos/blob/main/packages/sdk/client/src/packlets/proxies/halo-proxy.ts#L95)
Type: <code>undefined | Device</code>

### [devices](https://github.com/dxos/dxos/blob/main/packages/sdk/client/src/packlets/proxies/halo-proxy.ts#L91)
Type: <code>MulticastObservable&lt;Device[]&gt;</code>

### [identity](https://github.com/dxos/dxos/blob/main/packages/sdk/client/src/packlets/proxies/halo-proxy.ts#L87)
Type: <code>MulticastObservable&lt;"null" | [Identity](/api/@dxos/client/interfaces/Identity)&gt;</code>

User identity info.

### [invitations](https://github.com/dxos/dxos/blob/main/packages/sdk/client/src/packlets/proxies/halo-proxy.ts#L103)
Type: <code>MulticastObservable&lt;[CancellableInvitationObservable](/api/@dxos/client/interfaces/CancellableInvitationObservable)[]&gt;</code>

### [opened](https://github.com/dxos/dxos/blob/main/packages/sdk/client/src/packlets/proxies/halo-proxy.ts#L108)
Type: <code>boolean</code>


## Methods
### [\[custom\]()](https://github.com/dxos/dxos/blob/main/packages/sdk/client/src/packlets/proxies/halo-proxy.ts#L73)



Returns: <code>string</code>

Arguments: none

### [acceptInvitation(invitation, \[options\])](https://github.com/dxos/dxos/blob/main/packages/sdk/client/src/packlets/proxies/halo-proxy.ts#L289)



Initiates accepting invitation.


Returns: <code>[AuthenticatingInvitationObservable](/api/@dxos/client/interfaces/AuthenticatingInvitationObservable)</code>

Arguments: 

`invitation`: <code>[Invitation](/api/@dxos/client/interfaces/Invitation)</code>

`options`: <code>[InvitationsOptions](/api/@dxos/client/types/InvitationsOptions)</code>

### [createIdentity(profile)](https://github.com/dxos/dxos/blob/main/packages/sdk/client/src/packlets/proxies/halo-proxy.ts#L179)



Create Identity.
Then initializes profile with given display name.


Returns: <code>Promise&lt;[Identity](/api/@dxos/client/interfaces/Identity)&gt;</code>

Arguments: 

`profile`: <code>object</code>

### [createInvitation(\[options\])](https://github.com/dxos/dxos/blob/main/packages/sdk/client/src/packlets/proxies/halo-proxy.ts#L248)



Initiates device invitation.


Returns: <code>[CancellableInvitationObservable](/api/@dxos/client/interfaces/CancellableInvitationObservable)</code>

Arguments: 

`options`: <code>[InvitationsOptions](/api/@dxos/client/types/InvitationsOptions)</code>

### [presentCredentials(options)](https://github.com/dxos/dxos/blob/main/packages/sdk/client/src/packlets/proxies/halo-proxy.ts#L318)



Present Credentials.


Returns: <code>Promise&lt;Presentation&gt;</code>

Arguments: 

`options`: <code>object</code>

### [queryCredentials(options)](https://github.com/dxos/dxos/blob/main/packages/sdk/client/src/packlets/proxies/halo-proxy.ts#L199)



Get Halo credentials for the current user.


Returns: <code>ObservableProvider&lt;object, Credential[]&gt;</code>

Arguments: 

`options`: <code>object</code>

### [recoverIdentity(recoveryKey)](https://github.com/dxos/dxos/blob/main/packages/sdk/client/src/packlets/proxies/halo-proxy.ts#L187)



Returns: <code>Promise&lt;[Identity](/api/@dxos/client/interfaces/Identity)&gt;</code>

Arguments: 

`recoveryKey`: <code>Uint8Array</code>

### [removeInvitation(id)](https://github.com/dxos/dxos/blob/main/packages/sdk/client/src/packlets/proxies/halo-proxy.ts#L278)



Removes device invitation.


Returns: <code>void</code>

Arguments: 

`id`: <code>string</code>

### [toJSON()](https://github.com/dxos/dxos/blob/main/packages/sdk/client/src/packlets/proxies/halo-proxy.ts#L77)



Returns: <code>object</code>

Arguments: none

### [writeCredentials(credentials)](https://github.com/dxos/dxos/blob/main/packages/sdk/client/src/packlets/proxies/halo-proxy.ts#L301)



Write credentials to halo profile.


Returns: <code>Promise&lt;void&gt;</code>

Arguments: 

`credentials`: <code>Credential[]</code>
