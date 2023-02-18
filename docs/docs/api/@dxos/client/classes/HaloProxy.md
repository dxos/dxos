# Class `HaloProxy`
<<<<<<< HEAD
<<<<<<< HEAD
<sub>Declared in [packages/sdk/client/src/packlets/proxies/halo-proxy.ts:69](https://github.com/dxos/dxos/blob/main/packages/sdk/client/src/packlets/proxies/halo-proxy.ts#L69)</sub>
=======
<sub>Declared in [packages/sdk/client/src/packlets/proxies/halo-proxy.ts:58](https://github.com/dxos/dxos/blob/main/packages/sdk/client/src/packlets/proxies/halo-proxy.ts#L58)</sub>
>>>>>>> 464c6e793 (docs wip)
=======
<sub>Declared in [packages/sdk/client/src/packlets/proxies/halo-proxy.ts:69](https://github.com/dxos/dxos/blob/main/packages/sdk/client/src/packlets/proxies/halo-proxy.ts#L69)</sub>
>>>>>>> 4df9c9ec7 (wip docs)


TODO(burdon): Public API (move comments here).

## Constructors
<<<<<<< HEAD
<<<<<<< HEAD
### [constructor(_serviceProvider)](https://github.com/dxos/dxos/blob/main/packages/sdk/client/src/packlets/proxies/halo-proxy.ts#L82)
=======
### [constructor(_serviceProvider)](https://github.com/dxos/dxos/blob/main/packages/sdk/client/src/packlets/proxies/halo-proxy.ts#L71)
>>>>>>> 464c6e793 (docs wip)
=======
### [constructor(_serviceProvider)](https://github.com/dxos/dxos/blob/main/packages/sdk/client/src/packlets/proxies/halo-proxy.ts#L82)
>>>>>>> 4df9c9ec7 (wip docs)


Returns: <code>[HaloProxy](/api/@dxos/client/classes/HaloProxy)</code>

Arguments: 

`_serviceProvider`: <code>[ClientServicesProvider](/api/@dxos/client/interfaces/ClientServicesProvider)</code>

## Properties
<<<<<<< HEAD
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
=======
### [invitationsUpdate](https://github.com/dxos/dxos/blob/main/packages/sdk/client/src/packlets/proxies/halo-proxy.ts#L72)
>>>>>>> 4df9c9ec7 (wip docs)
Type: <code>Event&lt;void | [CancellableInvitationObservable](/api/@dxos/client/interfaces/CancellableInvitationObservable)&gt;</code>
### [profileChanged](https://github.com/dxos/dxos/blob/main/packages/sdk/client/src/packlets/proxies/halo-proxy.ts#L73)
Type: <code>Event&lt;void&gt;</code>
### [invitations](https://github.com/dxos/dxos/blob/main/packages/sdk/client/src/packlets/proxies/halo-proxy.ts#L104)
Type: <code>[CancellableInvitationObservable](/api/@dxos/client/interfaces/CancellableInvitationObservable)[]</code>
### [opened](https://github.com/dxos/dxos/blob/main/packages/sdk/client/src/packlets/proxies/halo-proxy.ts#L109)
Type: <code>boolean</code>
<<<<<<< HEAD
### [profile](https://github.com/dxos/dxos/blob/main/packages/sdk/client/src/packlets/proxies/halo-proxy.ts#L89)
>>>>>>> 464c6e793 (docs wip)
=======
### [profile](https://github.com/dxos/dxos/blob/main/packages/sdk/client/src/packlets/proxies/halo-proxy.ts#L100)
>>>>>>> 4df9c9ec7 (wip docs)
Type: <code>undefined | [Profile](/api/@dxos/client/interfaces/Profile)</code>

User profile info.

## Methods
<<<<<<< HEAD
<<<<<<< HEAD
### [\[custom\]()](https://github.com/dxos/dxos/blob/main/packages/sdk/client/src/packlets/proxies/halo-proxy.ts#L86)
=======
### [\[custom\]()](https://github.com/dxos/dxos/blob/main/packages/sdk/client/src/packlets/proxies/halo-proxy.ts#L75)
>>>>>>> 464c6e793 (docs wip)
=======
### [\[custom\]()](https://github.com/dxos/dxos/blob/main/packages/sdk/client/src/packlets/proxies/halo-proxy.ts#L86)
>>>>>>> 4df9c9ec7 (wip docs)


Returns: <code>string</code>

Arguments: none
<<<<<<< HEAD
<<<<<<< HEAD
### [acceptInvitation(invitation, \[options\])](https://github.com/dxos/dxos/blob/main/packages/sdk/client/src/packlets/proxies/halo-proxy.ts#L332)
=======
### [acceptInvitation(invitation, \[options\])](https://github.com/dxos/dxos/blob/main/packages/sdk/client/src/packlets/proxies/halo-proxy.ts#L273)
>>>>>>> 464c6e793 (docs wip)
=======
### [acceptInvitation(invitation, \[options\])](https://github.com/dxos/dxos/blob/main/packages/sdk/client/src/packlets/proxies/halo-proxy.ts#L332)
>>>>>>> 4df9c9ec7 (wip docs)


Initiates accepting invitation.

Returns: <code>[AuthenticatingInvitationObservable](/api/@dxos/client/interfaces/AuthenticatingInvitationObservable)</code>

Arguments: 

`invitation`: <code>[Invitation](/api/@dxos/client/interfaces/Invitation)</code>

`options`: <code>InvitationsOptions</code>
<<<<<<< HEAD
<<<<<<< HEAD
### [close()](https://github.com/dxos/dxos/blob/main/packages/sdk/client/src/packlets/proxies/halo-proxy.ts#L147)
=======
### [close()](https://github.com/dxos/dxos/blob/main/packages/sdk/client/src/packlets/proxies/halo-proxy.ts#L136)
>>>>>>> 464c6e793 (docs wip)
=======
### [close()](https://github.com/dxos/dxos/blob/main/packages/sdk/client/src/packlets/proxies/halo-proxy.ts#L147)
>>>>>>> 4df9c9ec7 (wip docs)


Destroy the instance and clean-up subscriptions.

Returns: <code>Promise&lt;void&gt;</code>

Arguments: none
<<<<<<< HEAD
<<<<<<< HEAD
### [createInvitation(\[options\])](https://github.com/dxos/dxos/blob/main/packages/sdk/client/src/packlets/proxies/halo-proxy.ts#L290)
=======
### [createInvitation(\[options\])](https://github.com/dxos/dxos/blob/main/packages/sdk/client/src/packlets/proxies/halo-proxy.ts#L231)
>>>>>>> 464c6e793 (docs wip)
=======
### [createInvitation(\[options\])](https://github.com/dxos/dxos/blob/main/packages/sdk/client/src/packlets/proxies/halo-proxy.ts#L290)
>>>>>>> 4df9c9ec7 (wip docs)


Initiates device invitation.

Returns: <code>[CancellableInvitationObservable](/api/@dxos/client/interfaces/CancellableInvitationObservable)</code>

Arguments: 

`options`: <code>InvitationsOptions</code>
<<<<<<< HEAD
<<<<<<< HEAD
### [createProfile(options)](https://github.com/dxos/dxos/blob/main/packages/sdk/client/src/packlets/proxies/halo-proxy.ts#L169)
=======
### [createProfile(options)](https://github.com/dxos/dxos/blob/main/packages/sdk/client/src/packlets/proxies/halo-proxy.ts#L158)
>>>>>>> 464c6e793 (docs wip)
=======
### [createProfile(options)](https://github.com/dxos/dxos/blob/main/packages/sdk/client/src/packlets/proxies/halo-proxy.ts#L169)
>>>>>>> 4df9c9ec7 (wip docs)


Create Profile.
Add Identity key if public and secret key are provided.
Then initializes profile with given display name.
If no public and secret key or seedphrase are provided it relies on keyring to contain an identity key.
Seedphrase must not be specified with existing keys.

Returns: <code>Promise&lt;[Profile](/api/@dxos/client/interfaces/Profile)&gt;</code>

Arguments: 

`options`: <code>CreateProfileOptions</code>
<<<<<<< HEAD
<<<<<<< HEAD
### [open()](https://github.com/dxos/dxos/blob/main/packages/sdk/client/src/packlets/proxies/halo-proxy.ts#L116)
=======
### [open()](https://github.com/dxos/dxos/blob/main/packages/sdk/client/src/packlets/proxies/halo-proxy.ts#L105)
>>>>>>> 464c6e793 (docs wip)
=======
### [open()](https://github.com/dxos/dxos/blob/main/packages/sdk/client/src/packlets/proxies/halo-proxy.ts#L116)
>>>>>>> 4df9c9ec7 (wip docs)


Allocate resources and set-up internal subscriptions.

Returns: <code>Promise&lt;void&gt;</code>

Arguments: none
<<<<<<< HEAD
<<<<<<< HEAD
=======
>>>>>>> 4df9c9ec7 (wip docs)
### [presentCredentials(options)](https://github.com/dxos/dxos/blob/main/packages/sdk/client/src/packlets/proxies/halo-proxy.ts#L360)


Present Credentials.

Returns: <code>Promise&lt;Presentation&gt;</code>

Arguments: 

`options`: <code>object</code>
### [queryContacts()](https://github.com/dxos/dxos/blob/main/packages/sdk/client/src/packlets/proxies/halo-proxy.ts#L205)
<<<<<<< HEAD
=======
### [queryContacts()](https://github.com/dxos/dxos/blob/main/packages/sdk/client/src/packlets/proxies/halo-proxy.ts#L194)
>>>>>>> 464c6e793 (docs wip)
=======
>>>>>>> 4df9c9ec7 (wip docs)


Query for contacts. Contacts represent member keys across all known Spaces.

Returns: <code>[ResultSet](/api/@dxos/client/classes/ResultSet)&lt;[Contact](/api/@dxos/client/interfaces/Contact)&gt;</code>

Arguments: none
<<<<<<< HEAD
<<<<<<< HEAD
=======
>>>>>>> 4df9c9ec7 (wip docs)
### [queryCredentials(options)](https://github.com/dxos/dxos/blob/main/packages/sdk/client/src/packlets/proxies/halo-proxy.ts#L242)


Get Halo credentials for the current user.

Returns: <code>ObservableProvider&lt;object, Credential[]&gt;</code>

Arguments: 

`options`: <code>object</code>
### [queryDevices()](https://github.com/dxos/dxos/blob/main/packages/sdk/client/src/packlets/proxies/halo-proxy.ts#L212)
<<<<<<< HEAD
=======
### [queryDevices()](https://github.com/dxos/dxos/blob/main/packages/sdk/client/src/packlets/proxies/halo-proxy.ts#L201)
>>>>>>> 464c6e793 (docs wip)
=======
>>>>>>> 4df9c9ec7 (wip docs)


Get set of authenticated devices.

Returns: <code>ObservableProvider&lt;DeviceEvents, DeviceInfo[]&gt;</code>

Arguments: none
<<<<<<< HEAD
<<<<<<< HEAD
### [recoverProfile(seedPhrase)](https://github.com/dxos/dxos/blob/main/packages/sdk/client/src/packlets/proxies/halo-proxy.ts#L194)
=======
### [recoverProfile(seedPhrase)](https://github.com/dxos/dxos/blob/main/packages/sdk/client/src/packlets/proxies/halo-proxy.ts#L183)
>>>>>>> 464c6e793 (docs wip)
=======
### [recoverProfile(seedPhrase)](https://github.com/dxos/dxos/blob/main/packages/sdk/client/src/packlets/proxies/halo-proxy.ts#L194)
>>>>>>> 4df9c9ec7 (wip docs)


Joins an existing identity HALO from a recovery seed phrase.

Returns: <code>Promise&lt;[Profile](/api/@dxos/client/interfaces/Profile)&gt;</code>

Arguments: 

`seedPhrase`: <code>string</code>
<<<<<<< HEAD
<<<<<<< HEAD
### [removeInvitation(id)](https://github.com/dxos/dxos/blob/main/packages/sdk/client/src/packlets/proxies/halo-proxy.ts#L321)
=======
### [removeInvitation(id)](https://github.com/dxos/dxos/blob/main/packages/sdk/client/src/packlets/proxies/halo-proxy.ts#L262)
>>>>>>> 464c6e793 (docs wip)
=======
### [removeInvitation(id)](https://github.com/dxos/dxos/blob/main/packages/sdk/client/src/packlets/proxies/halo-proxy.ts#L321)
>>>>>>> 4df9c9ec7 (wip docs)


Removes device invitation.

Returns: <code>void</code>

Arguments: 

`id`: <code>string</code>
<<<<<<< HEAD
<<<<<<< HEAD
### [subscribeToProfile(callback)](https://github.com/dxos/dxos/blob/main/packages/sdk/client/src/packlets/proxies/halo-proxy.ts#L157)
=======
### [subscribeToProfile(callback)](https://github.com/dxos/dxos/blob/main/packages/sdk/client/src/packlets/proxies/halo-proxy.ts#L146)
>>>>>>> 464c6e793 (docs wip)
=======
### [subscribeToProfile(callback)](https://github.com/dxos/dxos/blob/main/packages/sdk/client/src/packlets/proxies/halo-proxy.ts#L157)
>>>>>>> 4df9c9ec7 (wip docs)


Returns: <code>function</code>

Arguments: 

`callback`: <code>function</code>
<<<<<<< HEAD
<<<<<<< HEAD
### [toJSON()](https://github.com/dxos/dxos/blob/main/packages/sdk/client/src/packlets/proxies/halo-proxy.ts#L91)
=======
### [toJSON()](https://github.com/dxos/dxos/blob/main/packages/sdk/client/src/packlets/proxies/halo-proxy.ts#L80)
>>>>>>> 464c6e793 (docs wip)
=======
### [toJSON()](https://github.com/dxos/dxos/blob/main/packages/sdk/client/src/packlets/proxies/halo-proxy.ts#L91)
>>>>>>> 4df9c9ec7 (wip docs)


Returns: <code>object</code>

Arguments: none
### [writeCredentials(credentials)](https://github.com/dxos/dxos/blob/main/packages/sdk/client/src/packlets/proxies/halo-proxy.ts#L344)


Write credentials to halo profile.

Returns: <code>Promise&lt;void&gt;</code>

Arguments: 

`credentials`: <code>Credential[]</code>