# Class `HaloProxy`
<sub>Declared in [packages/sdk/client/src/packlets/proxies/halo-proxy.ts:69](https://github.com/dxos/dxos/blob/main/packages/sdk/client/src/packlets/proxies/halo-proxy.ts#L69)</sub>


TODO(burdon): Public API (move comments here).

## Constructors
### [constructor(_serviceProvider)](https://github.com/dxos/dxos/blob/main/packages/sdk/client/src/packlets/proxies/halo-proxy.ts#L82)


Returns: <code>[HaloProxy](/api/@dxos/client/classes/HaloProxy)</code>

Arguments: 

`_serviceProvider`: <code>[ClientServicesProvider](/api/@dxos/client/interfaces/ClientServicesProvider)</code>

## Properties
### [invitationsUpdate](https://github.com/dxos/dxos/blob/main/packages/sdk/client/src/packlets/proxies/halo-proxy.ts#L72)
Type: <code>Event&lt;void | [CancellableInvitationObservable](/api/@dxos/client/interfaces/CancellableInvitationObservable)&gt;</code>
### [profileChanged](https://github.com/dxos/dxos/blob/main/packages/sdk/client/src/packlets/proxies/halo-proxy.ts#L73)
Type: <code>Event&lt;void&gt;</code>
### [invitations](https://github.com/dxos/dxos/blob/main/packages/sdk/client/src/packlets/proxies/halo-proxy.ts#L104)
Type: <code>[CancellableInvitationObservable](/api/@dxos/client/interfaces/CancellableInvitationObservable)[]</code>
### [opened](https://github.com/dxos/dxos/blob/main/packages/sdk/client/src/packlets/proxies/halo-proxy.ts#L109)
Type: <code>boolean</code>
### [identity](https://github.com/dxos/dxos/blob/main/packages/sdk/client/src/packlets/proxies/halo-proxy.ts#L83)
Type: <code>undefined | [Identity](/api/@dxos/client/interfaces/Identity)</code>

User identity info.

## Methods
### [\[custom\]()](https://github.com/dxos/dxos/blob/main/packages/sdk/client/src/packlets/proxies/halo-proxy.ts#L86)


Returns: <code>string</code>

Arguments: none
### [acceptInvitation(invitation, \[options\])](https://github.com/dxos/dxos/blob/main/packages/sdk/client/src/packlets/proxies/halo-proxy.ts#L332)


Initiates accepting invitation.

Returns: <code>[AuthenticatingInvitationObservable](/api/@dxos/client/interfaces/AuthenticatingInvitationObservable)</code>

Arguments: 

`invitation`: <code>[Invitation](/api/@dxos/client/interfaces/Invitation)</code>

`options`: <code>InvitationsOptions</code>
### [close()](https://github.com/dxos/dxos/blob/main/packages/sdk/client/src/packlets/proxies/halo-proxy.ts#L147)


Destroy the instance and clean-up subscriptions.

Returns: <code>Promise&lt;void&gt;</code>

Arguments: none
### [createInvitation(\[options\])](https://github.com/dxos/dxos/blob/main/packages/sdk/client/src/packlets/proxies/halo-proxy.ts#L290)


Initiates device invitation.

Returns: <code>[CancellableInvitationObservable](/api/@dxos/client/interfaces/CancellableInvitationObservable)</code>

Arguments: 

`options`: <code>InvitationsOptions</code>
### [createProfile(options)](https://github.com/dxos/dxos/blob/main/packages/sdk/client/src/packlets/proxies/halo-proxy.ts#L169)


Create Identity.
Add Identity key if public and secret key are provided.
Then initializes identity with given display name.
If no public and secret key or seedphrase are provided it relies on keyring to contain an identity key.
Seedphrase must not be specified with existing keys.

Returns: <code>Promise&lt;[Identity](/api/@dxos/client/interfaces/Identity)&gt;</code>

Arguments: 

<<<<<<< HEAD
`options`: <code>CreateProfileOptions</code>
### [open()](https://github.com/dxos/dxos/blob/main/packages/sdk/client/src/packlets/proxies/halo-proxy.ts#L116)
=======
`options`: <code>CreateIdentityOptions</code>
### [open()](https://github.com/dxos/dxos/blob/main/packages/sdk/client/src/packlets/proxies/halo-proxy.ts#L99)
>>>>>>> 6bb442d38 (Rename identity -> profile)


Allocate resources and set-up internal subscriptions.

Returns: <code>Promise&lt;void&gt;</code>

Arguments: none
### [presentCredentials(options)](https://github.com/dxos/dxos/blob/main/packages/sdk/client/src/packlets/proxies/halo-proxy.ts#L360)


Present Credentials.

Returns: <code>Promise&lt;Presentation&gt;</code>

Arguments: 

`options`: <code>object</code>
### [queryContacts()](https://github.com/dxos/dxos/blob/main/packages/sdk/client/src/packlets/proxies/halo-proxy.ts#L205)


Query for contacts. Contacts represent member keys across all known Spaces.

Returns: <code>[ResultSet](/api/@dxos/client/classes/ResultSet)&lt;[Contact](/api/@dxos/client/interfaces/Contact)&gt;</code>

Arguments: none
### [queryCredentials(options)](https://github.com/dxos/dxos/blob/main/packages/sdk/client/src/packlets/proxies/halo-proxy.ts#L242)


Get Halo credentials for the current user.

Returns: <code>ObservableProvider&lt;object, Credential[]&gt;</code>

Arguments: 

`options`: <code>object</code>
### [queryDevices()](https://github.com/dxos/dxos/blob/main/packages/sdk/client/src/packlets/proxies/halo-proxy.ts#L212)


Get set of authenticated devices.

Returns: <code>ObservableProvider&lt;DeviceEvents, DeviceInfo[]&gt;</code>

Arguments: none
### [recoverProfile(seedPhrase)](https://github.com/dxos/dxos/blob/main/packages/sdk/client/src/packlets/proxies/halo-proxy.ts#L194)


Joins an existing identity HALO from a recovery seed phrase.

Returns: <code>Promise&lt;[Identity](/api/@dxos/client/interfaces/Identity)&gt;</code>

Arguments: 

`seedPhrase`: <code>string</code>
### [removeInvitation(id)](https://github.com/dxos/dxos/blob/main/packages/sdk/client/src/packlets/proxies/halo-proxy.ts#L321)


Removes device invitation.

Returns: <code>void</code>

Arguments: 

`id`: <code>string</code>
### [subscribeToProfile(callback)](https://github.com/dxos/dxos/blob/main/packages/sdk/client/src/packlets/proxies/halo-proxy.ts#L157)


Returns: <code>function</code>

Arguments: 

`callback`: <code>function</code>
### [toJSON()](https://github.com/dxos/dxos/blob/main/packages/sdk/client/src/packlets/proxies/halo-proxy.ts#L91)


Returns: <code>object</code>

Arguments: none
### [writeCredentials(credentials)](https://github.com/dxos/dxos/blob/main/packages/sdk/client/src/packlets/proxies/halo-proxy.ts#L344)


Write credentials to halo profile.

Returns: <code>Promise&lt;void&gt;</code>

Arguments: 

`credentials`: <code>Credential[]</code>