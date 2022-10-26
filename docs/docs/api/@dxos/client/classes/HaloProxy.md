# Class `HaloProxy`
> Declared in [`packages/sdk/client/src/packlets/proxies/halo-proxy.ts:26`](https://github.com/dxos/protocols/blob/main/packages/sdk/client/src/packlets/proxies/halo-proxy.ts#L26)


Client proxy to local/remote HALO service.

## Constructors
### constructor
```ts
(_serviceProvider: ClientServiceProvider) => HaloProxy
```

## Properties
### profileChanged 
> Type: `Event<void>`
<br/>
### info
> Type: `HaloInfo`
<br/>
### invitationProxy
> Type: `InvitationProxy`
<br/>
### profile
> Type: `undefined | Profile`
<br/>

User profile info.

## Methods
### acceptInvitation
```ts
(invitationDescriptor: InvitationDescriptor) => Invitation<void>
```
Joins an existing identity HALO by invitation.
Used to authorize another device of the same user.
The Invitation flow requires the inviter device and invitee device to be online at the same time.
The invitation flow is protected by a generated pin code.

To be used with  `client.halo.createHaloInvitation`  on the inviter side.
### addKeyRecord
```ts
(keyRecord: KeyRecord) => Promise<void>
```
### createInvitation
```ts
() => Promise<InvitationRequest>
```
Creates an invitation to an existing HALO party.
Used to authorize another device of the same user.
The Invitation flow requires the inviter device and invitee device to be online at the same time.
The invitation flow is protected by a generated pin code.

To be used with  `client.halo.joinHaloInvitation`  on the invitee side.
### createProfile
```ts
(__namedParameters: any) => Promise<Profile>
```
Create Profile.
Add Identity key if public and secret key are provided.
Then initializes profile with given username.
If no public and secret key or seedphrase are provided it relies on keyring to contain an identity key.
Seedphrase must not be specified with existing keys.
### getDevicePreference
```ts
(key: string) => Promise<undefined | string>
```
### getGlobalPreference
```ts
(key: string) => Promise<undefined | string>
```
### queryContacts
```ts
() => ResultSet<any>
```
Query for contacts. Contacts represent member keys across all known Parties.
### queryDevices
```ts
() => Promise<DeviceInfo[]>
```
### recoverProfile
```ts
(seedPhrase: string) => Promise<Profile>
```
Joins an existing identity HALO from a recovery seed phrase.
### setDevicePreference
```ts
(key: string, value: string) => Promise<void>
```
### setGlobalPreference
```ts
(key: string, value: string) => Promise<void>
```
### sign
```ts
(request: SignRequest) => Promise<SignResponse>
```
### subscribeToProfile
```ts
(callback: function) => function
```
### toString
```ts
() => string
```