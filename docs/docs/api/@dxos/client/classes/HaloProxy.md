# Class `HaloProxy`
<<<<<<< HEAD
<sub>Declared in [packages/sdk/client/src/packlets/proxies/halo-proxy.ts:69](https://github.com/dxos/dxos/blob/main/packages/sdk/client/src/packlets/proxies/halo-proxy.ts#L69)</sub>
=======
<sub>Declared in [packages/sdk/client/src/packlets/proxies/halo-proxy.ts:58](https://github.com/dxos/dxos/blob/main/packages/sdk/client/src/packlets/proxies/halo-proxy.ts#L58)</sub>
>>>>>>> 464c6e793 (docs wip)


TODO(burdon): Public API (move comments here).

## Constructors
<<<<<<< HEAD
### [constructor(_serviceProvider)](https://github.com/dxos/dxos/blob/main/packages/sdk/client/src/packlets/proxies/halo-proxy.ts#L82)
=======
### [constructor(_serviceProvider)](https://github.com/dxos/dxos/blob/main/packages/sdk/client/src/packlets/proxies/halo-proxy.ts#L71)
>>>>>>> 464c6e793 (docs wip)


Returns: <code>[HaloProxy](/api/@dxos/client/classes/HaloProxy)</code>

Arguments: 

`_serviceProvider`: <code>[ClientServicesProvider](/api/@dxos/client/interfaces/ClientServicesProvider)</code>

## Properties
<<<<<<< HEAD
### [invitationsUpdate](https://github.com/dxos/dxos/blob/main/packages/sdk/client/src/packlets/proxies/halo-proxy.ts#L72)
Type: <code>Event&lt;void | [CancellableInvitationObservable](/api/@dxos/client/interfaces/CancellableInvitationObservable)&gt;</code>
### [profileChanged](https://github.com/dxos/dxos/blob/main/packages/sdk/client/src/packlets/proxies/halo-proxy.ts#L73)
Type: <code>Event&lt;void&gt;</code>
### [invitations](https://github.com/dxos/dxos/blob/main/packages/sdk/client/src/packlets/proxies/halo-proxy.ts#L104)
Type: <code>[CancellableInvitationObservable](/api/@dxos/client/interfaces/CancellableInvitationObservable)[]</code>
### [opened](https://github.com/dxos/dxos/blob/main/packages/sdk/client/src/packlets/proxies/halo-proxy.ts#L109)
Type: <code>boolean</code>
### [profile](https://github.com/dxos/dxos/blob/main/packages/sdk/client/src/packlets/proxies/halo-proxy.ts#L100)
=======
### [invitationsUpdate](https://github.com/dxos/dxos/blob/main/packages/sdk/client/src/packlets/proxies/halo-proxy.ts#L61)
Type: <code>Event&lt;void | [CancellableInvitationObservable](/api/@dxos/client/interfaces/CancellableInvitationObservable)&gt;</code>
### [profileChanged](https://github.com/dxos/dxos/blob/main/packages/sdk/client/src/packlets/proxies/halo-proxy.ts#L62)
Type: <code>Event&lt;void&gt;</code>
### [invitations](https://github.com/dxos/dxos/blob/main/packages/sdk/client/src/packlets/proxies/halo-proxy.ts#L93)
Type: <code>[CancellableInvitationObservable](/api/@dxos/client/interfaces/CancellableInvitationObservable)[]</code>
### [opened](https://github.com/dxos/dxos/blob/main/packages/sdk/client/src/packlets/proxies/halo-proxy.ts#L98)
Type: <code>boolean</code>
### [profile](https://github.com/dxos/dxos/blob/main/packages/sdk/client/src/packlets/proxies/halo-proxy.ts#L89)
>>>>>>> 464c6e793 (docs wip)
Type: <code>undefined | [Profile](/api/@dxos/client/interfaces/Profile)</code>

User profile info.

## Methods
<<<<<<< HEAD
### [\[custom\]()](https://github.com/dxos/dxos/blob/main/packages/sdk/client/src/packlets/proxies/halo-proxy.ts#L86)
=======
### [\[custom\]()](https://github.com/dxos/dxos/blob/main/packages/sdk/client/src/packlets/proxies/halo-proxy.ts#L75)
>>>>>>> 464c6e793 (docs wip)


Returns: <code>string</code>

Arguments: none
<<<<<<< HEAD
### [acceptInvitation(invitation, \[options\])](https://github.com/dxos/dxos/blob/main/packages/sdk/client/src/packlets/proxies/halo-proxy.ts#L332)
=======
### [acceptInvitation(invitation, \[options\])](https://github.com/dxos/dxos/blob/main/packages/sdk/client/src/packlets/proxies/halo-proxy.ts#L273)
>>>>>>> 464c6e793 (docs wip)


Initiates accepting invitation.

Returns: <code>[AuthenticatingInvitationObservable](/api/@dxos/client/interfaces/AuthenticatingInvitationObservable)</code>

Arguments: 

`invitation`: <code>[Invitation](/api/@dxos/client/interfaces/Invitation)</code>

`options`: <code>InvitationsOptions</code>
<<<<<<< HEAD
### [close()](https://github.com/dxos/dxos/blob/main/packages/sdk/client/src/packlets/proxies/halo-proxy.ts#L147)
=======
### [close()](https://github.com/dxos/dxos/blob/main/packages/sdk/client/src/packlets/proxies/halo-proxy.ts#L136)
>>>>>>> 464c6e793 (docs wip)


Destroy the instance and clean-up subscriptions.

Returns: <code>Promise&lt;void&gt;</code>

Arguments: none
<<<<<<< HEAD
### [createInvitation(\[options\])](https://github.com/dxos/dxos/blob/main/packages/sdk/client/src/packlets/proxies/halo-proxy.ts#L290)
=======
### [createInvitation(\[options\])](https://github.com/dxos/dxos/blob/main/packages/sdk/client/src/packlets/proxies/halo-proxy.ts#L231)
>>>>>>> 464c6e793 (docs wip)


Initiates device invitation.

Returns: <code>[CancellableInvitationObservable](/api/@dxos/client/interfaces/CancellableInvitationObservable)</code>

Arguments: 

`options`: <code>InvitationsOptions</code>
<<<<<<< HEAD
### [createProfile(options)](https://github.com/dxos/dxos/blob/main/packages/sdk/client/src/packlets/proxies/halo-proxy.ts#L169)
=======
### [createProfile(options)](https://github.com/dxos/dxos/blob/main/packages/sdk/client/src/packlets/proxies/halo-proxy.ts#L158)
>>>>>>> 464c6e793 (docs wip)


Create Profile.
Add Identity key if public and secret key are provided.
Then initializes profile with given display name.
If no public and secret key or seedphrase are provided it relies on keyring to contain an identity key.
Seedphrase must not be specified with existing keys.

Returns: <code>Promise&lt;[Profile](/api/@dxos/client/interfaces/Profile)&gt;</code>

Arguments: 

`options`: <code>CreateProfileOptions</code>
<<<<<<< HEAD
### [open()](https://github.com/dxos/dxos/blob/main/packages/sdk/client/src/packlets/proxies/halo-proxy.ts#L116)
=======
### [open()](https://github.com/dxos/dxos/blob/main/packages/sdk/client/src/packlets/proxies/halo-proxy.ts#L105)
>>>>>>> 464c6e793 (docs wip)


Allocate resources and set-up internal subscriptions.

Returns: <code>Promise&lt;void&gt;</code>

Arguments: none
<<<<<<< HEAD
### [presentCredentials(options)](https://github.com/dxos/dxos/blob/main/packages/sdk/client/src/packlets/proxies/halo-proxy.ts#L360)


Present Credentials.

Returns: <code>Promise&lt;Presentation&gt;</code>

Arguments: 

`options`: <code>object</code>
### [queryContacts()](https://github.com/dxos/dxos/blob/main/packages/sdk/client/src/packlets/proxies/halo-proxy.ts#L205)
=======
### [queryContacts()](https://github.com/dxos/dxos/blob/main/packages/sdk/client/src/packlets/proxies/halo-proxy.ts#L194)
>>>>>>> 464c6e793 (docs wip)


Query for contacts. Contacts represent member keys across all known Spaces.

Returns: <code>[ResultSet](/api/@dxos/client/classes/ResultSet)&lt;[Contact](/api/@dxos/client/interfaces/Contact)&gt;</code>

Arguments: none
<<<<<<< HEAD
### [queryCredentials(options)](https://github.com/dxos/dxos/blob/main/packages/sdk/client/src/packlets/proxies/halo-proxy.ts#L242)


Get Halo credentials for the current user.

Returns: <code>ObservableProvider&lt;object, Credential[]&gt;</code>

Arguments: 

`options`: <code>object</code>
### [queryDevices()](https://github.com/dxos/dxos/blob/main/packages/sdk/client/src/packlets/proxies/halo-proxy.ts#L212)
=======
### [queryDevices()](https://github.com/dxos/dxos/blob/main/packages/sdk/client/src/packlets/proxies/halo-proxy.ts#L201)
>>>>>>> 464c6e793 (docs wip)


Get set of authenticated devices.

Returns: <code>ObservableProvider&lt;DeviceEvents, DeviceInfo[]&gt;</code>

Arguments: none
<<<<<<< HEAD
### [recoverProfile(seedPhrase)](https://github.com/dxos/dxos/blob/main/packages/sdk/client/src/packlets/proxies/halo-proxy.ts#L194)
=======
### [recoverProfile(seedPhrase)](https://github.com/dxos/dxos/blob/main/packages/sdk/client/src/packlets/proxies/halo-proxy.ts#L183)
>>>>>>> 464c6e793 (docs wip)


Joins an existing identity HALO from a recovery seed phrase.

Returns: <code>Promise&lt;[Profile](/api/@dxos/client/interfaces/Profile)&gt;</code>

Arguments: 

`seedPhrase`: <code>string</code>
<<<<<<< HEAD
### [removeInvitation(id)](https://github.com/dxos/dxos/blob/main/packages/sdk/client/src/packlets/proxies/halo-proxy.ts#L321)
=======
### [removeInvitation(id)](https://github.com/dxos/dxos/blob/main/packages/sdk/client/src/packlets/proxies/halo-proxy.ts#L262)
>>>>>>> 464c6e793 (docs wip)


Removes device invitation.

Returns: <code>void</code>

Arguments: 

`id`: <code>string</code>
<<<<<<< HEAD
### [subscribeToProfile(callback)](https://github.com/dxos/dxos/blob/main/packages/sdk/client/src/packlets/proxies/halo-proxy.ts#L157)
=======
### [subscribeToProfile(callback)](https://github.com/dxos/dxos/blob/main/packages/sdk/client/src/packlets/proxies/halo-proxy.ts#L146)
>>>>>>> 464c6e793 (docs wip)


Returns: <code>function</code>

Arguments: 

`callback`: <code>function</code>
<<<<<<< HEAD
### [toJSON()](https://github.com/dxos/dxos/blob/main/packages/sdk/client/src/packlets/proxies/halo-proxy.ts#L91)
=======
### [toJSON()](https://github.com/dxos/dxos/blob/main/packages/sdk/client/src/packlets/proxies/halo-proxy.ts#L80)
>>>>>>> 464c6e793 (docs wip)


Returns: <code>object</code>

Arguments: none
### [writeCredentials(credentials)](https://github.com/dxos/dxos/blob/main/packages/sdk/client/src/packlets/proxies/halo-proxy.ts#L344)


Write credentials to halo profile.

Returns: <code>Promise&lt;void&gt;</code>

Arguments: 

`credentials`: <code>Credential[]</code>