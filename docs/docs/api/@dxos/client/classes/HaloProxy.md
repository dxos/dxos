# Class `HaloProxy`
Declared in [`packages/sdk/client/src/packlets/proxies/halo-proxy.ts:50`](https://github.com/dxos/protocols/blob/main/packages/sdk/client/src/packlets/proxies/halo-proxy.ts#L50)


TODO(burdon): Public API (move comments here).

## Constructors
### [`constructor`](https://github.com/dxos/protocols/blob/main/packages/sdk/client/src/packlets/proxies/halo-proxy.ts#L60)


Returns: [`HaloProxy`](/api/@dxos/client/classes/HaloProxy)

Arguments: 

`_serviceProvider`: [`ClientServicesProvider`](/api/@dxos/client/interfaces/ClientServicesProvider)

## Properties
### [`profileChanged`](https://github.com/dxos/protocols/blob/main/packages/sdk/client/src/packlets/proxies/halo-proxy.ts#L54)
Type: `Event<void>`
### [`profile`](https://github.com/dxos/protocols/blob/main/packages/sdk/client/src/packlets/proxies/halo-proxy.ts#L78)
Type: `undefined | `[`Profile`](/api/@dxos/client/interfaces/Profile)

User profile info.

## Methods
### [`[custom]`](https://github.com/dxos/protocols/blob/main/packages/sdk/client/src/packlets/proxies/halo-proxy.ts#L64)


Returns: `string`

Arguments: none
### [`acceptInvitation`](https://github.com/dxos/protocols/blob/main/packages/sdk/client/src/packlets/proxies/halo-proxy.ts#L140)


Returns: `Promise<`[`InvitationObservable`](/api/@dxos/client/interfaces/InvitationObservable)`>`

Arguments: 

`invitation`: [`Invitation`](/api/@dxos/client/interfaces/Invitation)
### [`createInvitation`](https://github.com/dxos/protocols/blob/main/packages/sdk/client/src/packlets/proxies/halo-proxy.ts#L136)


Returns: `Promise<`[`InvitationObservable`](/api/@dxos/client/interfaces/InvitationObservable)`>`

Arguments: none
### [`createProfile`](https://github.com/dxos/protocols/blob/main/packages/sdk/client/src/packlets/proxies/halo-proxy.ts#L98)


Create Profile.
Add Identity key if public and secret key are provided.
Then initializes profile with given display name.
If no public and secret key or seedphrase are provided it relies on keyring to contain an identity key.
Seedphrase must not be specified with existing keys.

Returns: `Promise<`[`Profile`](/api/@dxos/client/interfaces/Profile)`>`

Arguments: 

`__namedParameters`: `CreateProfileOptions`
### [`queryContacts`](https://github.com/dxos/protocols/blob/main/packages/sdk/client/src/packlets/proxies/halo-proxy.ts#L132)


Query for contacts. Contacts represent member keys across all known Parties.

Returns: [`ResultSet`](/api/@dxos/client/classes/ResultSet)`<`[`Contact`](/api/@dxos/client/interfaces/Contact)`>`

Arguments: none
### [`queryDevices`](https://github.com/dxos/protocols/blob/main/packages/sdk/client/src/packlets/proxies/halo-proxy.ts#L144)


Returns: `Promise<DeviceInfo[]>`

Arguments: none
### [`recoverProfile`](https://github.com/dxos/protocols/blob/main/packages/sdk/client/src/packlets/proxies/halo-proxy.ts#L122)


Joins an existing identity HALO from a recovery seed phrase.

Returns: `Promise<`[`Profile`](/api/@dxos/client/interfaces/Profile)`>`

Arguments: 

`seedPhrase`: `string`
### [`subscribeToProfile`](https://github.com/dxos/protocols/blob/main/packages/sdk/client/src/packlets/proxies/halo-proxy.ts#L86)


Returns: `function`

Arguments: 

`callback`: `function`
### [`toJSON`](https://github.com/dxos/protocols/blob/main/packages/sdk/client/src/packlets/proxies/halo-proxy.ts#L69)


Returns: `object`

Arguments: none