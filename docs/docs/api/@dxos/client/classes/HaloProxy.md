# Class `HaloProxy`
> Declared in [`packages/sdk/client/src/packlets/proxies/halo-proxy.ts:26`](https://github.com/dxos/protocols/blob/main/packages/sdk/client/src/packlets/proxies/halo-proxy.ts#L26)


Client proxy to local/remote HALO service.

## Constructors
### constructor
```ts
(_serviceProvider: ClientServiceProvider) => [HaloProxy](/api/@dxos/client/classes/HaloProxy)
```

## Properties
### profileChanged 
Type: Event&lt;void&gt;
### info
Type: [HaloInfo](/api/@dxos/client/interfaces/HaloInfo)
### invitationProxy
Type: [InvitationProxy](/api/@dxos/client/classes/InvitationProxy)
### profile
Type: undefined | [Profile](/api/@dxos/client/interfaces/Profile)

User profile info.

## Methods
### acceptInvitation
```ts
(invitationDescriptor: [InvitationDescriptor](/api/@dxos/client/classes/InvitationDescriptor)) => [Invitation](/api/@dxos/client/classes/Invitation)&lt;void&gt;
```
Joins an existing identity HALO by invitation.
Used to authorize another device of the same user.
The Invitation flow requires the inviter device and invitee device to be online at the same time.
The invitation flow is protected by a generated pin code.

To be used with  `client.halo.createHaloInvitation`  on the inviter side.
### addKeyRecord
```ts
(keyRecord: [KeyRecord](/api/@dxos/client/interfaces/KeyRecord)) => Promise&lt;void&gt;
```
### createInvitation
```ts
() => Promise&lt;[InvitationRequest](/api/@dxos/client/classes/InvitationRequest)&gt;
```
Creates an invitation to an existing HALO party.
Used to authorize another device of the same user.
The Invitation flow requires the inviter device and invitee device to be online at the same time.
The invitation flow is protected by a generated pin code.

To be used with  `client.halo.joinHaloInvitation`  on the invitee side.
### createProfile
```ts
(__namedParameters: any) => Promise&lt;[Profile](/api/@dxos/client/interfaces/Profile)&gt;
```
Create Profile.
Add Identity key if public and secret key are provided.
Then initializes profile with given username.
If no public and secret key or seedphrase are provided it relies on keyring to contain an identity key.
Seedphrase must not be specified with existing keys.
### getDevicePreference
```ts
(key: string) => Promise&lt;undefined | string&gt;
```
### getGlobalPreference
```ts
(key: string) => Promise&lt;undefined | string&gt;
```
### queryContacts
```ts
() => [ResultSet](/api/@dxos/client/classes/ResultSet)&lt;any&gt;
```
Query for contacts. Contacts represent member keys across all known Parties.
### queryDevices
```ts
() => Promise&lt;DeviceInfo[]&gt;
```
### recoverProfile
```ts
(seedPhrase: string) => Promise&lt;[Profile](/api/@dxos/client/interfaces/Profile)&gt;
```
Joins an existing identity HALO from a recovery seed phrase.
### setDevicePreference
```ts
(key: string, value: string) => Promise&lt;void&gt;
```
### setGlobalPreference
```ts
(key: string, value: string) => Promise&lt;void&gt;
```
### sign
```ts
(request: [SignRequest](/api/@dxos/client/interfaces/SignRequest)) => Promise&lt;[SignResponse](/api/@dxos/client/interfaces/SignResponse)&gt;
```
### subscribeToProfile
```ts
(callback: function) => function
```
### toString
```ts
() => string
```