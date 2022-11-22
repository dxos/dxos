# Class `HaloProxy`
<sub>Declared in [packages/sdk/client/src/packlets/proxies/halo-proxy.ts:48](https://github.com/dxos/protocols/blob/main/packages/sdk/client/src/packlets/proxies/halo-proxy.ts#L48)</sub>


TODO(burdon): Public API (move comments here).

## Constructors
### [constructor(_serviceProvider)](https://github.com/dxos/protocols/blob/main/packages/sdk/client/src/packlets/proxies/halo-proxy.ts#L61)


Returns: <code>[HaloProxy](/api/@dxos/client/classes/HaloProxy)</code>

Arguments: 

`_serviceProvider`: <code>[ClientServicesProvider](/api/@dxos/client/interfaces/ClientServicesProvider)</code>

## Properties
### [invitationsUpdate](https://github.com/dxos/protocols/blob/main/packages/sdk/client/src/packlets/proxies/halo-proxy.ts#L54)
Type: <code>Event&lt;[InvitationObservable](/api/@dxos/client/interfaces/InvitationObservable)&gt;</code>
### [profileChanged](https://github.com/dxos/protocols/blob/main/packages/sdk/client/src/packlets/proxies/halo-proxy.ts#L55)
Type: <code>Event&lt;void&gt;</code>
### [invitations](https://github.com/dxos/protocols/blob/main/packages/sdk/client/src/packlets/proxies/halo-proxy.ts#L83)
Type: <code>[InvitationObservable](/api/@dxos/client/interfaces/InvitationObservable)[]</code>
### [profile](https://github.com/dxos/protocols/blob/main/packages/sdk/client/src/packlets/proxies/halo-proxy.ts#L79)
Type: <code>undefined | [Profile](/api/@dxos/client/interfaces/Profile)</code>

User profile info.

## Methods
### [\[custom\]()](https://github.com/dxos/protocols/blob/main/packages/sdk/client/src/packlets/proxies/halo-proxy.ts#L65)


Returns: <code>string</code>

Arguments: none
### [acceptInvitation(invitation, \[options\])](https://github.com/dxos/protocols/blob/main/packages/sdk/client/src/packlets/proxies/halo-proxy.ts#L163)


Returns: <code>Promise&lt;[AuthenticatingInvitationObservable](/api/@dxos/client/interfaces/AuthenticatingInvitationObservable)&gt;</code>

Arguments: 

`invitation`: <code>[Invitation](/api/@dxos/client/interfaces/Invitation)</code>

`options`: <code>InvitationsOptions</code>
### [createInvitation(\[options\])](https://github.com/dxos/protocols/blob/main/packages/sdk/client/src/packlets/proxies/halo-proxy.ts#L141)


Returns: <code>Promise&lt;[InvitationObservable](/api/@dxos/client/interfaces/InvitationObservable)&gt;</code>

Arguments: 

`options`: <code>InvitationsOptions</code>
### [createProfile(options)](https://github.com/dxos/protocols/blob/main/packages/sdk/client/src/packlets/proxies/halo-proxy.ts#L103)


Create Profile.
Add Identity key if public and secret key are provided.
Then initializes profile with given display name.
If no public and secret key or seedphrase are provided it relies on keyring to contain an identity key.
Seedphrase must not be specified with existing keys.

Returns: <code>Promise&lt;[Profile](/api/@dxos/client/interfaces/Profile)&gt;</code>

Arguments: 

`options`: <code>CreateProfileOptions</code>
### [queryContacts()](https://github.com/dxos/protocols/blob/main/packages/sdk/client/src/packlets/proxies/halo-proxy.ts#L137)


Query for contacts. Contacts represent member keys across all known Spaces.

Returns: <code>[ResultSet](/api/@dxos/client/classes/ResultSet)&lt;[Contact](/api/@dxos/client/interfaces/Contact)&gt;</code>

Arguments: none
### [queryDevices()](https://github.com/dxos/protocols/blob/main/packages/sdk/client/src/packlets/proxies/halo-proxy.ts#L182)


Returns: <code>Promise&lt;DeviceInfo[]&gt;</code>

Arguments: none
### [recoverProfile(seedPhrase)](https://github.com/dxos/protocols/blob/main/packages/sdk/client/src/packlets/proxies/halo-proxy.ts#L127)


Joins an existing identity HALO from a recovery seed phrase.

Returns: <code>Promise&lt;[Profile](/api/@dxos/client/interfaces/Profile)&gt;</code>

Arguments: 

`seedPhrase`: <code>string</code>
### [subscribeToProfile(callback)](https://github.com/dxos/protocols/blob/main/packages/sdk/client/src/packlets/proxies/halo-proxy.ts#L91)


Returns: <code>function</code>

Arguments: 

`callback`: <code>function</code>
### [toJSON()](https://github.com/dxos/protocols/blob/main/packages/sdk/client/src/packlets/proxies/halo-proxy.ts#L70)


Returns: <code>object</code>

Arguments: none