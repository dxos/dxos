# Class `HaloProxy`
<sub>Declared in [packages/sdk/client/src/halo/halo-proxy.ts:40](https://github.com/dxos/dxos/blob/235256b25/packages/sdk/client/src/halo/halo-proxy.ts#L40)</sub>


TODO(burdon): Public API (move comments here).

## Constructors
### [constructor(_serviceProvider)](https://github.com/dxos/dxos/blob/235256b25/packages/sdk/client/src/halo/halo-proxy.ts#L53)




Returns: <code>[HaloProxy](/api/@dxos/client/classes/HaloProxy)</code>

Arguments: 

`_serviceProvider`: <code>[ClientServicesProvider](/api/@dxos/client/interfaces/ClientServicesProvider)</code>



## Properties
### [contacts](https://github.com/dxos/dxos/blob/235256b25/packages/sdk/client/src/halo/halo-proxy.ts#L88)
Type: <code>MulticastObservable&lt;[Contact](/api/@dxos/client/interfaces/Contact)[]&gt;</code>



### [device](https://github.com/dxos/dxos/blob/235256b25/packages/sdk/client/src/halo/halo-proxy.ts#L84)
Type: <code>undefined | [Device](/api/@dxos/client/interfaces/Device)</code>



### [devices](https://github.com/dxos/dxos/blob/235256b25/packages/sdk/client/src/halo/halo-proxy.ts#L80)
Type: <code>MulticastObservable&lt;[Device](/api/@dxos/client/interfaces/Device)[]&gt;</code>



### [identity](https://github.com/dxos/dxos/blob/235256b25/packages/sdk/client/src/halo/halo-proxy.ts#L76)
Type: <code>MulticastObservable&lt;"null" | [Identity](/api/@dxos/client/interfaces/Identity)&gt;</code>

User identity info.

### [invitations](https://github.com/dxos/dxos/blob/235256b25/packages/sdk/client/src/halo/halo-proxy.ts#L92)
Type: <code>MulticastObservable&lt;[CancellableInvitation](/api/@dxos/client/classes/CancellableInvitationObservable)[]&gt;</code>



### [opened](https://github.com/dxos/dxos/blob/235256b25/packages/sdk/client/src/halo/halo-proxy.ts#L99)
Type: <code>boolean</code>




## Methods
### [\[custom\]()](https://github.com/dxos/dxos/blob/235256b25/packages/sdk/client/src/halo/halo-proxy.ts#L61)




Returns: <code>string</code>

Arguments: none




### [createIdentity(profile, deviceProfile)](https://github.com/dxos/dxos/blob/235256b25/packages/sdk/client/src/halo/halo-proxy.ts#L190)


Create Identity.
Then initializes profile with given display name.

Returns: <code>Promise&lt;[Identity](/api/@dxos/client/interfaces/Identity)&gt;</code>

Arguments: 

`profile`: <code>ProfileDocument</code>

`deviceProfile`: <code>undefined | DeviceProfileDocument</code>


### [join(invitation, \[deviceProfile\])](https://github.com/dxos/dxos/blob/235256b25/packages/sdk/client/src/halo/halo-proxy.ts#L290)


Initiates accepting invitation.

Returns: <code>[AuthenticatingInvitation](/api/@dxos/client/classes/AuthenticatingInvitationObservable)</code>

Arguments: 

`invitation`: <code>string | [Invitation](/api/@dxos/client/interfaces/Invitation)</code>

`deviceProfile`: <code>DeviceProfileDocument</code>


### [presentCredentials(options)](https://github.com/dxos/dxos/blob/235256b25/packages/sdk/client/src/halo/halo-proxy.ts#L323)


Present Credentials.

Returns: <code>Promise&lt;Presentation&gt;</code>

Arguments: 

`options`: <code>object</code>


### [queryCredentials(options)](https://github.com/dxos/dxos/blob/235256b25/packages/sdk/client/src/halo/halo-proxy.ts#L225)


Get Halo credentials for the current user.

Returns: <code>ObservableProvider&lt;object, [Credential](/api/@dxos/client/interfaces/Credential)[]&gt;</code>

Arguments: 

`options`: <code>object</code>


### [recoverIdentity(recoveryKey)](https://github.com/dxos/dxos/blob/235256b25/packages/sdk/client/src/halo/halo-proxy.ts#L207)




Returns: <code>Promise&lt;[Identity](/api/@dxos/client/interfaces/Identity)&gt;</code>

Arguments: 

`recoveryKey`: <code>Uint8Array</code>


### [share(\[options\])](https://github.com/dxos/dxos/blob/235256b25/packages/sdk/client/src/halo/halo-proxy.ts#L275)


Initiates device invitation.

Returns: <code>[CancellableInvitation](/api/@dxos/client/classes/CancellableInvitationObservable)</code>

Arguments: 

`options`: <code>Partial&lt;[Invitation](/api/@dxos/client/interfaces/Invitation)&gt;</code>


### [toJSON()](https://github.com/dxos/dxos/blob/235256b25/packages/sdk/client/src/halo/halo-proxy.ts#L66)




Returns: <code>object</code>

Arguments: none




### [updateProfile(profile)](https://github.com/dxos/dxos/blob/235256b25/packages/sdk/client/src/halo/halo-proxy.ts#L214)




Returns: <code>Promise&lt;[Identity](/api/@dxos/client/interfaces/Identity)&gt;</code>

Arguments: 

`profile`: <code>ProfileDocument</code>


### [writeCredentials(credentials)](https://github.com/dxos/dxos/blob/235256b25/packages/sdk/client/src/halo/halo-proxy.ts#L305)


Write credentials to halo profile.

Returns: <code>Promise&lt;void&gt;</code>

Arguments: 

`credentials`: <code>[Credential](/api/@dxos/client/interfaces/Credential)[]</code>


