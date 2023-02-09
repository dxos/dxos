# Class `HaloProxy`
<sub>Declared in [packages/sdk/client/dist/types/src/packlets/proxies/halo-proxy.d.ts:31]()</sub>


TODO(burdon): Public API (move comments here).

## Constructors
### [constructor(_serviceProvider)]()


Returns: <code>[HaloProxy](/api/@dxos/react-client/classes/HaloProxy)</code>

Arguments: 

`_serviceProvider`: <code>[ClientServicesProvider](/api/@dxos/react-client/interfaces/ClientServicesProvider)</code>

## Properties
### [invitationsUpdate]()
Type: <code>Event&lt;void | [CancellableInvitationObservable](/api/@dxos/react-client/interfaces/CancellableInvitationObservable)&gt;</code>
### [profileChanged]()
Type: <code>Event&lt;void&gt;</code>
### [invitations]()
Type: <code>[CancellableInvitationObservable](/api/@dxos/react-client/interfaces/CancellableInvitationObservable)[]</code>
### [opened]()
Type: <code>boolean</code>
### [profile]()
Type: <code>undefined | [Profile](/api/@dxos/react-client/interfaces/Profile)</code>

User profile info.

## Methods
### [\[custom\]()]()


Returns: <code>string</code>

Arguments: none
### [acceptInvitation(invitation, \[options\])]()


Initiates accepting invitation.

Returns: <code>[AuthenticatingInvitationObservable](/api/@dxos/react-client/interfaces/AuthenticatingInvitationObservable)</code>

Arguments: 

`invitation`: <code>[Invitation](/api/@dxos/react-client/interfaces/Invitation)</code>

`options`: <code>InvitationsOptions</code>
### [close()]()


Destroy the instance and clean-up subscriptions.

Returns: <code>Promise&lt;void&gt;</code>

Arguments: none
### [createInvitation(\[options\])]()


Initiates device invitation.

Returns: <code>[CancellableInvitationObservable](/api/@dxos/react-client/interfaces/CancellableInvitationObservable)</code>

Arguments: 

`options`: <code>InvitationsOptions</code>
### [createProfile(\[options\])]()


Create Profile.
Add Identity key if public and secret key are provided.
Then initializes profile with given display name.
If no public and secret key or seedphrase are provided it relies on keyring to contain an identity key.
Seedphrase must not be specified with existing keys.

Returns: <code>Promise&lt;[Profile](/api/@dxos/react-client/interfaces/Profile)&gt;</code>

Arguments: 

`options`: <code>CreateProfileOptions</code>
### [open()]()


Allocate resources and set-up internal subscriptions.

Returns: <code>Promise&lt;void&gt;</code>

Arguments: none
### [queryContacts()]()


Query for contacts. Contacts represent member keys across all known Spaces.

Returns: <code>[ResultSet](/api/@dxos/react-client/classes/ResultSet)&lt;[Contact](/api/@dxos/react-client/interfaces/Contact)&gt;</code>

Arguments: none
### [queryDevices()]()


Get set of authenticated devices.

Returns: <code>Promise&lt;DeviceInfo[]&gt;</code>

Arguments: none
### [recoverProfile(seedPhrase)]()


Joins an existing identity HALO from a recovery seed phrase.

Returns: <code>Promise&lt;[Profile](/api/@dxos/react-client/interfaces/Profile)&gt;</code>

Arguments: 

`seedPhrase`: <code>string</code>
### [removeInvitation(id)]()


Removes device invitation.

Returns: <code>void</code>

Arguments: 

`id`: <code>string</code>
### [subscribeToProfile(callback)]()


Returns: <code>function</code>

Arguments: 

`callback`: <code>function</code>
### [toJSON()]()


Returns: <code>object</code>

Arguments: none