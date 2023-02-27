# Class `HaloProxy`
<sub>Declared in [packages/sdk/client/src/packlets/proxies/halo-proxy.ts:56](https://github.com/dxos/dxos/blob/main/packages/sdk/client/src/packlets/proxies/halo-proxy.ts#L56)</sub>


TODO(burdon): Public API (move comments here).

## Constructors
### [constructor(_serviceProvider)](https://github.com/dxos/dxos/blob/main/packages/sdk/client/src/packlets/proxies/halo-proxy.ts#L71)


Returns: <code>[HaloProxy](/api/@dxos/client/classes/HaloProxy)</code>

Arguments: 

`_serviceProvider`: <code>[ClientServicesProvider](/api/@dxos/client/interfaces/ClientServicesProvider)</code>

## Properties
### [identityChanged](https://github.com/dxos/dxos/blob/main/packages/sdk/client/src/packlets/proxies/halo-proxy.ts#L61)
Type: <code>Event&lt;void&gt;</code>
### [invitationsUpdate](https://github.com/dxos/dxos/blob/main/packages/sdk/client/src/packlets/proxies/halo-proxy.ts#L60)
Type: <code>Event&lt;void | [CancellableInvitationObservable](/api/@dxos/client/interfaces/CancellableInvitationObservable)&gt;</code>
### [device](https://github.com/dxos/dxos/blob/main/packages/sdk/client/src/packlets/proxies/halo-proxy.ts#L93)
Type: <code>undefined | Device</code>
### [identity](https://github.com/dxos/dxos/blob/main/packages/sdk/client/src/packlets/proxies/halo-proxy.ts#L89)
Type: <code>undefined | [Identity](/api/@dxos/client/interfaces/Identity)</code>

User identity info.
### [invitations](https://github.com/dxos/dxos/blob/main/packages/sdk/client/src/packlets/proxies/halo-proxy.ts#L97)
Type: <code>[CancellableInvitationObservable](/api/@dxos/client/interfaces/CancellableInvitationObservable)[]</code>
### [opened](https://github.com/dxos/dxos/blob/main/packages/sdk/client/src/packlets/proxies/halo-proxy.ts#L102)
Type: <code>boolean</code>

## Methods
### [\[custom\]()](https://github.com/dxos/dxos/blob/main/packages/sdk/client/src/packlets/proxies/halo-proxy.ts#L75)


Returns: <code>string</code>

Arguments: none
### [acceptInvitation(invitation, \[options\])](https://github.com/dxos/dxos/blob/main/packages/sdk/client/src/packlets/proxies/halo-proxy.ts#L287)


Initiates accepting invitation.

Returns: <code>[AuthenticatingInvitationObservable](/api/@dxos/client/interfaces/AuthenticatingInvitationObservable)</code>

Arguments: 

`invitation`: <code>[Invitation](/api/@dxos/client/interfaces/Invitation)</code>

`options`: <code>InvitationsOptions</code>
### [close()](https://github.com/dxos/dxos/blob/main/packages/sdk/client/src/packlets/proxies/halo-proxy.ts#L148)


Destroy the instance and clean-up subscriptions.

Returns: <code>Promise&lt;void&gt;</code>

Arguments: none
### [createIdentity(profile)](https://github.com/dxos/dxos/blob/main/packages/sdk/client/src/packlets/proxies/halo-proxy.ts#L159)


Create Identity.
Then initializes profile with given display name.

Returns: <code>Promise&lt;[Identity](/api/@dxos/client/interfaces/Identity)&gt;</code>

Arguments: 

`profile`: <code>object</code>
### [createInvitation(\[options\])](https://github.com/dxos/dxos/blob/main/packages/sdk/client/src/packlets/proxies/halo-proxy.ts#L245)


Initiates device invitation.

Returns: <code>[CancellableInvitationObservable](/api/@dxos/client/interfaces/CancellableInvitationObservable)</code>

Arguments: 

`options`: <code>InvitationsOptions</code>
### [getContacts()](https://github.com/dxos/dxos/blob/main/packages/sdk/client/src/packlets/proxies/halo-proxy.ts#L185)


Returns: <code>[Contact](/api/@dxos/client/interfaces/Contact)[]</code>

Arguments: none
### [getDevices()](https://github.com/dxos/dxos/blob/main/packages/sdk/client/src/packlets/proxies/halo-proxy.ts#L177)


Returns: <code>Device[]</code>

Arguments: none
### [open()](https://github.com/dxos/dxos/blob/main/packages/sdk/client/src/packlets/proxies/halo-proxy.ts#L109)


Allocate resources and set-up internal subscriptions.

Returns: <code>Promise&lt;void&gt;</code>

Arguments: none
### [presentCredentials(options)](https://github.com/dxos/dxos/blob/main/packages/sdk/client/src/packlets/proxies/halo-proxy.ts#L315)


Present Credentials.

Returns: <code>Promise&lt;Presentation&gt;</code>

Arguments: 

`options`: <code>object</code>
### [queryCredentials(options)](https://github.com/dxos/dxos/blob/main/packages/sdk/client/src/packlets/proxies/halo-proxy.ts#L197)


Get Halo credentials for the current user.

Returns: <code>ObservableProvider&lt;object, Credential[]&gt;</code>

Arguments: 

`options`: <code>object</code>
### [recoverIdentity(recoveryKey)](https://github.com/dxos/dxos/blob/main/packages/sdk/client/src/packlets/proxies/halo-proxy.ts#L166)


Returns: <code>Promise&lt;[Identity](/api/@dxos/client/interfaces/Identity)&gt;</code>

Arguments: 

`recoveryKey`: <code>Uint8Array</code>
### [removeInvitation(id)](https://github.com/dxos/dxos/blob/main/packages/sdk/client/src/packlets/proxies/halo-proxy.ts#L276)


Removes device invitation.

Returns: <code>void</code>

Arguments: 

`id`: <code>string</code>
### [subscribeContacts(callback)](https://github.com/dxos/dxos/blob/main/packages/sdk/client/src/packlets/proxies/halo-proxy.ts#L189)


Returns: <code>UnsubscribeCallback</code>

Arguments: 

`callback`: <code>function</code>
### [subscribeDevices(callback)](https://github.com/dxos/dxos/blob/main/packages/sdk/client/src/packlets/proxies/halo-proxy.ts#L181)


Returns: <code>UnsubscribeCallback</code>

Arguments: 

`callback`: <code>function</code>
### [subscribeIdentity(callback)](https://github.com/dxos/dxos/blob/main/packages/sdk/client/src/packlets/proxies/halo-proxy.ts#L173)


Returns: <code>function</code>

Arguments: 

`callback`: <code>function</code>
### [toJSON()](https://github.com/dxos/dxos/blob/main/packages/sdk/client/src/packlets/proxies/halo-proxy.ts#L80)


Returns: <code>object</code>

Arguments: none
### [writeCredentials(credentials)](https://github.com/dxos/dxos/blob/main/packages/sdk/client/src/packlets/proxies/halo-proxy.ts#L299)


Write credentials to halo profile.

Returns: <code>Promise&lt;void&gt;</code>

Arguments: 

`credentials`: <code>Credential[]</code>