# Class `HaloProxy`
> Declared in [`packages/sdk/client/src/packlets/proxies/halo-proxy.ts:26`](https://github.com/dxos/protocols/blob/main/packages/sdk/client/src/packlets/proxies/halo-proxy.ts#L26)


Client proxy to local/remote HALO service.

## Constructors
```ts
new HaloProxy (_serviceProvider: ClientServiceProvider) => HaloProxy
```

## Properties
### `profileChanged: Event<void>`
### `info:  get HaloInfo`
### `invitationProxy:  get InvitationProxy`
### `profile:  get undefined | Profile`
User profile info.

## Functions
```ts
acceptInvitation (invitationDescriptor: InvitationDescriptor) => Invitation<void>
```
Joins an existing identity HALO by invitation.
Used to authorize another device of the same user.
The Invitation flow requires the inviter device and invitee device to be online at the same time.
The invitation flow is protected by a generated pin code.

To be used with  `client.halo.createHaloInvitation`  on the inviter side.
```ts
addKeyRecord (keyRecord: KeyRecord) => Promise<void>
```
```ts
createInvitation () => Promise<InvitationRequest>
```
Creates an invitation to an existing HALO party.
Used to authorize another device of the same user.
The Invitation flow requires the inviter device and invitee device to be online at the same time.
The invitation flow is protected by a generated pin code.

To be used with  `client.halo.joinHaloInvitation`  on the invitee side.
```ts
createProfile (__namedParameters: any) => Promise<Profile>
```
Create Profile.
Add Identity key if public and secret key are provided.
Then initializes profile with given username.
If no public and secret key or seedphrase are provided it relies on keyring to contain an identity key.
Seedphrase must not be specified with existing keys.
```ts
getDevicePreference (key: string) => Promise<undefined | string>
```
```ts
getGlobalPreference (key: string) => Promise<undefined | string>
```
```ts
queryContacts () => ResultSet<any>
```
Query for contacts. Contacts represent member keys across all known Parties.
```ts
queryDevices () => Promise<DeviceInfo[]>
```
```ts
recoverProfile (seedPhrase: string) => Promise<Profile>
```
Joins an existing identity HALO from a recovery seed phrase.
```ts
setDevicePreference (key: string, value: string) => Promise<void>
```
```ts
setGlobalPreference (key: string, value: string) => Promise<void>
```
```ts
sign (request: SignRequest) => Promise<SignResponse>
```
```ts
subscribeToProfile (callback: function) => function
```
```ts
toString () => string
```