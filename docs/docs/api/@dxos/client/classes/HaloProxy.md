# Class `HaloProxy`
Declared in [`packages/sdk/client/src/packlets/proxies/halo-proxy.ts:25`](https://github.com/dxos/protocols/blob/main/packages/sdk/client/src/packlets/proxies/halo-proxy.ts#L25)


Client proxy to local/remote HALO service.

## Constructors
### [`constructor`](https://github.com/dxos/protocols/blob/main/packages/sdk/client/src/packlets/proxies/halo-proxy.ts#L35)


Returns: [`HaloProxy`](/api/@dxos/client/classes/HaloProxy)

Arguments: 

`_serviceProvider`: `ClientServiceProvider`

## Properties
### [`profileChanged`](https://github.com/dxos/protocols/blob/main/packages/sdk/client/src/packlets/proxies/halo-proxy.ts#L30)
Type: `Event<void>`
### [`info`](https://github.com/dxos/protocols/blob/main/packages/sdk/client/src/packlets/proxies/halo-proxy.ts#L41)
Type: [`HaloInfo`](/api/@dxos/client/interfaces/HaloInfo)
### [`invitationProxy`](https://github.com/dxos/protocols/blob/main/packages/sdk/client/src/packlets/proxies/halo-proxy.ts#L47)
Type: [`InvitationProxy`](/api/@dxos/client/classes/InvitationProxy)
### [`profile`](https://github.com/dxos/protocols/blob/main/packages/sdk/client/src/packlets/proxies/halo-proxy.ts#L54)
Type: `undefined | `[`Profile`](/api/@dxos/client/interfaces/Profile)

User profile info.

## Methods
### [`acceptInvitation`](https://github.com/dxos/protocols/blob/main/packages/sdk/client/src/packlets/proxies/halo-proxy.ts#L131)


Joins an existing identity HALO by invitation.
Used to authorize another device of the same user.
The Invitation flow requires the inviter device and invitee device to be online at the same time.
The invitation flow is protected by a generated pin code.

To be used with  `client.halo.createHaloInvitation`  on the inviter side.

Returns: [`InvitationChallenge`](/api/@dxos/client/classes/InvitationChallenge)`<void>`

Arguments: 

`invitationDescriptor`: [`InvitationWrapper`](/api/@dxos/client/classes/InvitationWrapper)
### [`addKeyRecord`](https://github.com/dxos/protocols/blob/main/packages/sdk/client/src/packlets/proxies/halo-proxy.ts#L156)


Returns: `Promise<void>`

Arguments: 

`keyRecord`: [`KeyRecord`](/api/@dxos/client/interfaces/KeyRecord)
### [`createInvitation`](https://github.com/dxos/protocols/blob/main/packages/sdk/client/src/packlets/proxies/halo-proxy.ts#L118)


Creates an invitation to an existing HALO party.
Used to authorize another device of the same user.
The Invitation flow requires the inviter device and invitee device to be online at the same time.
The invitation flow is protected by a generated pin code.

To be used with  `client.halo.joinHaloInvitation`  on the invitee side.

Returns: `Promise<`[`InvitationRequest`](/api/@dxos/client/classes/InvitationRequest)`>`

Arguments: none
### [`createProfile`](https://github.com/dxos/protocols/blob/main/packages/sdk/client/src/packlets/proxies/halo-proxy.ts#L74)


Create Profile.
Add Identity key if public and secret key are provided.
Then initializes profile with given username.
If no public and secret key or seedphrase are provided it relies on keyring to contain an identity key.
Seedphrase must not be specified with existing keys.

Returns: `Promise<`[`Profile`](/api/@dxos/client/interfaces/Profile)`>`

Arguments: 

`__namedParameters`: `any`
### [`getDevicePreference`](https://github.com/dxos/protocols/blob/main/packages/sdk/client/src/packlets/proxies/halo-proxy.ts#L174)


Returns: `Promise<undefined | string>`

Arguments: 

`key`: `string`
### [`getGlobalPreference`](https://github.com/dxos/protocols/blob/main/packages/sdk/client/src/packlets/proxies/halo-proxy.ts#L189)


Returns: `Promise<undefined | string>`

Arguments: 

`key`: `string`
### [`queryContacts`](https://github.com/dxos/protocols/blob/main/packages/sdk/client/src/packlets/proxies/halo-proxy.ts#L106)


Query for contacts. Contacts represent member keys across all known Parties.

Returns: [`ResultSet`](/api/@dxos/client/classes/ResultSet)`<any>`

Arguments: none
### [`queryDevices`](https://github.com/dxos/protocols/blob/main/packages/sdk/client/src/packlets/proxies/halo-proxy.ts#L163)


Returns: `Promise<DeviceInfo[]>`

Arguments: none
### [`recoverProfile`](https://github.com/dxos/protocols/blob/main/packages/sdk/client/src/packlets/proxies/halo-proxy.ts#L96)


Joins an existing identity HALO from a recovery seed phrase.

Returns: `Promise<`[`Profile`](/api/@dxos/client/interfaces/Profile)`>`

Arguments: 

`seedPhrase`: `string`
### [`setDevicePreference`](https://github.com/dxos/protocols/blob/main/packages/sdk/client/src/packlets/proxies/halo-proxy.ts#L167)


Returns: `Promise<void>`

Arguments: 

`key`: `string`

`value`: `string`
### [`setGlobalPreference`](https://github.com/dxos/protocols/blob/main/packages/sdk/client/src/packlets/proxies/halo-proxy.ts#L182)


Returns: `Promise<void>`

Arguments: 

`key`: `string`

`value`: `string`
### [`sign`](https://github.com/dxos/protocols/blob/main/packages/sdk/client/src/packlets/proxies/halo-proxy.ts#L152)


Returns: `Promise<`[`SignResponse`](/api/@dxos/client/interfaces/SignResponse)`>`

Arguments: 

`request`: [`SignRequest`](/api/@dxos/client/interfaces/SignRequest)
### [`subscribeToProfile`](https://github.com/dxos/protocols/blob/main/packages/sdk/client/src/packlets/proxies/halo-proxy.ts#L62)


Returns: `function`

Arguments: 

`callback`: `function`
### [`toString`](https://github.com/dxos/protocols/blob/main/packages/sdk/client/src/packlets/proxies/halo-proxy.ts#L37)


Returns: `string`

Arguments: none