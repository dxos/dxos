# Class `HaloProxy`
<sub>Declared in [packages/sdk/client/src/packlets/proxies/halo-proxy.ts:51](https://github.com/dxos/dxos/blob/main/packages/sdk/client/src/packlets/proxies/halo-proxy.ts#L51)</sub>


TODO(burdon): Public API (move comments here).

## Constructors
### [constructor(_serviceProvider)](https://github.com/dxos/dxos/blob/main/packages/sdk/client/src/packlets/proxies/halo-proxy.ts#L64)


Returns: <code>[HaloProxy](/api/@dxos/client/classes/HaloProxy)</code>

Arguments: 

`_serviceProvider`: <code>[ClientServicesProvider](/api/@dxos/client/interfaces/ClientServicesProvider)</code>

## Properties
### [invitationsUpdate](https://github.com/dxos/dxos/blob/main/packages/sdk/client/src/packlets/proxies/halo-proxy.ts#L54)
Type: <code>Event&lt;void | [CancellableInvitationObservable](/api/@dxos/client/interfaces/CancellableInvitationObservable)&gt;</code>
### [profileChanged](https://github.com/dxos/dxos/blob/main/packages/sdk/client/src/packlets/proxies/halo-proxy.ts#L55)
Type: <code>Event&lt;void&gt;</code>
### [invitations](https://github.com/dxos/dxos/blob/main/packages/sdk/client/src/packlets/proxies/halo-proxy.ts#L86)
Type: <code>[CancellableInvitationObservable](/api/@dxos/client/interfaces/CancellableInvitationObservable)[]</code>
### [opened](https://github.com/dxos/dxos/blob/main/packages/sdk/client/src/packlets/proxies/halo-proxy.ts#L91)
Type: <code>boolean</code>
### [profile](https://github.com/dxos/dxos/blob/main/packages/sdk/client/src/packlets/proxies/halo-proxy.ts#L82)
Type: <code>undefined | [Profile](/api/@dxos/client/interfaces/Profile)</code>

User profile info.

## Methods
### [\[custom\]()](https://github.com/dxos/dxos/blob/main/packages/sdk/client/src/packlets/proxies/halo-proxy.ts#L68)


Returns: <code>string</code>

Arguments: none
### [acceptInvitation(invitation, \[options\])](https://github.com/dxos/dxos/blob/main/packages/sdk/client/src/packlets/proxies/halo-proxy.ts#L255)


Initiates accepting invitation.

Returns: <code>[AuthenticatingInvitationObservable](/api/@dxos/client/interfaces/AuthenticatingInvitationObservable)</code>

Arguments: 

`invitation`: <code>[Invitation](/api/@dxos/client/interfaces/Invitation)</code>

`options`: <code>InvitationsOptions</code>
### [close()](https://github.com/dxos/dxos/blob/main/packages/sdk/client/src/packlets/proxies/halo-proxy.ts#L127)


Destroy the instance and clean-up subscriptions.

Returns: <code>Promise&lt;void&gt;</code>

Arguments: none
### [createInvitation(\[options\])](https://github.com/dxos/dxos/blob/main/packages/sdk/client/src/packlets/proxies/halo-proxy.ts#L213)


Initiates device invitation.

Returns: <code>[CancellableInvitationObservable](/api/@dxos/client/interfaces/CancellableInvitationObservable)</code>

Arguments: 

`options`: <code>InvitationsOptions</code>
### [createProfile(options)](https://github.com/dxos/dxos/blob/main/packages/sdk/client/src/packlets/proxies/halo-proxy.ts#L147)


Create Profile.
Add Identity key if public and secret key are provided.
Then initializes profile with given display name.
If no public and secret key or seedphrase are provided it relies on keyring to contain an identity key.
Seedphrase must not be specified with existing keys.

Returns: <code>Promise&lt;[Profile](/api/@dxos/client/interfaces/Profile)&gt;</code>

Arguments: 

`options`: <code>CreateProfileOptions</code>
### [open()](https://github.com/dxos/dxos/blob/main/packages/sdk/client/src/packlets/proxies/halo-proxy.ts#L98)


Allocate resources and set-up internal subscriptions.

Returns: <code>Promise&lt;void&gt;</code>

Arguments: none
### [queryContacts()](https://github.com/dxos/dxos/blob/main/packages/sdk/client/src/packlets/proxies/halo-proxy.ts#L181)


Query for contacts. Contacts represent member keys across all known Spaces.

Returns: <code>[ResultSet](/api/@dxos/client/classes/ResultSet)&lt;[Contact](/api/@dxos/client/interfaces/Contact)&gt;</code>

Arguments: none
### [queryDevices()](https://github.com/dxos/dxos/blob/main/packages/sdk/client/src/packlets/proxies/halo-proxy.ts#L189)


Get set of authenticated devices.

Returns: <code>Promise&lt;DeviceInfo[]&gt;</code>

Arguments: none
### [recoverProfile(seedPhrase)](https://github.com/dxos/dxos/blob/main/packages/sdk/client/src/packlets/proxies/halo-proxy.ts#L171)


Joins an existing identity HALO from a recovery seed phrase.

Returns: <code>Promise&lt;[Profile](/api/@dxos/client/interfaces/Profile)&gt;</code>

Arguments: 

`seedPhrase`: <code>string</code>
### [removeInvitation(id)](https://github.com/dxos/dxos/blob/main/packages/sdk/client/src/packlets/proxies/halo-proxy.ts#L244)


Removes device invitation.

Returns: <code>void</code>

Arguments: 

`id`: <code>string</code>
### [subscribeToProfile(callback)](https://github.com/dxos/dxos/blob/main/packages/sdk/client/src/packlets/proxies/halo-proxy.ts#L135)


Returns: <code>function</code>

Arguments: 

`callback`: <code>function</code>
### [toJSON()](https://github.com/dxos/dxos/blob/main/packages/sdk/client/src/packlets/proxies/halo-proxy.ts#L73)


Returns: <code>object</code>

Arguments: none