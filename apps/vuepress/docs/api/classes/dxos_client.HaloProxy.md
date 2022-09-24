# Class: HaloProxy

[@dxos/client](../modules/dxos_client.md).HaloProxy

Client proxy to local/remote HALO service.

## Implements

- [`Halo`](../interfaces/dxos_client.Halo.md)

## Table of contents

### Constructors

- [constructor](dxos_client.HaloProxy.md#constructor)

### Properties

- [\_contacts](dxos_client.HaloProxy.md#_contacts)
- [\_contactsChanged](dxos_client.HaloProxy.md#_contactschanged)
- [\_invitationProxy](dxos_client.HaloProxy.md#_invitationproxy)
- [\_profile](dxos_client.HaloProxy.md#_profile)
- [\_subscriptions](dxos_client.HaloProxy.md#_subscriptions)
- [profileChanged](dxos_client.HaloProxy.md#profilechanged)

### Accessors

- [info](dxos_client.HaloProxy.md#info)
- [invitationProxy](dxos_client.HaloProxy.md#invitationproxy)
- [profile](dxos_client.HaloProxy.md#profile)

### Methods

- [acceptInvitation](dxos_client.HaloProxy.md#acceptinvitation)
- [addKeyRecord](dxos_client.HaloProxy.md#addkeyrecord)
- [createInvitation](dxos_client.HaloProxy.md#createinvitation)
- [createProfile](dxos_client.HaloProxy.md#createprofile)
- [getDevicePreference](dxos_client.HaloProxy.md#getdevicepreference)
- [getGlobalPreference](dxos_client.HaloProxy.md#getglobalpreference)
- [queryContacts](dxos_client.HaloProxy.md#querycontacts)
- [queryDevices](dxos_client.HaloProxy.md#querydevices)
- [recoverProfile](dxos_client.HaloProxy.md#recoverprofile)
- [setDevicePreference](dxos_client.HaloProxy.md#setdevicepreference)
- [setGlobalPreference](dxos_client.HaloProxy.md#setglobalpreference)
- [sign](dxos_client.HaloProxy.md#sign)
- [subscribeToProfile](dxos_client.HaloProxy.md#subscribetoprofile)
- [toString](dxos_client.HaloProxy.md#tostring)

## Constructors

### constructor

• **new HaloProxy**(`_serviceProvider`)

#### Parameters

| Name | Type |
| :------ | :------ |
| `_serviceProvider` | [`ClientServiceProvider`](../interfaces/dxos_client.ClientServiceProvider.md) |

#### Defined in

[packages/sdk/client/src/packlets/proxy/halo-proxy.ts:34](https://github.com/dxos/dxos/blob/e3b936721/packages/sdk/client/src/packlets/proxy/halo-proxy.ts#L34)

## Properties

### \_contacts

• `Private` **\_contacts**: [`PartyMember`](../interfaces/dxos_client.PartyMember.md)[] = `[]`

#### Defined in

[packages/sdk/client/src/packlets/proxy/halo-proxy.ts:32](https://github.com/dxos/dxos/blob/e3b936721/packages/sdk/client/src/packlets/proxy/halo-proxy.ts#L32)

___

### \_contactsChanged

• `Private` `Readonly` **\_contactsChanged**: `Event`<`void`\>

#### Defined in

[packages/sdk/client/src/packlets/proxy/halo-proxy.ts:28](https://github.com/dxos/dxos/blob/e3b936721/packages/sdk/client/src/packlets/proxy/halo-proxy.ts#L28)

___

### \_invitationProxy

• `Private` `Readonly` **\_invitationProxy**: [`InvitationProxy`](dxos_client.InvitationProxy.md)

#### Defined in

[packages/sdk/client/src/packlets/proxy/halo-proxy.ts:25](https://github.com/dxos/dxos/blob/e3b936721/packages/sdk/client/src/packlets/proxy/halo-proxy.ts#L25)

___

### \_profile

• `Private` `Optional` **\_profile**: [`Profile`](../interfaces/dxos_client.Profile.md)

#### Defined in

[packages/sdk/client/src/packlets/proxy/halo-proxy.ts:31](https://github.com/dxos/dxos/blob/e3b936721/packages/sdk/client/src/packlets/proxy/halo-proxy.ts#L31)

___

### \_subscriptions

• `Private` `Readonly` **\_subscriptions**: `SubscriptionGroup`

#### Defined in

[packages/sdk/client/src/packlets/proxy/halo-proxy.ts:26](https://github.com/dxos/dxos/blob/e3b936721/packages/sdk/client/src/packlets/proxy/halo-proxy.ts#L26)

___

### profileChanged

• `Readonly` **profileChanged**: `Event`<`void`\>

#### Defined in

[packages/sdk/client/src/packlets/proxy/halo-proxy.ts:29](https://github.com/dxos/dxos/blob/e3b936721/packages/sdk/client/src/packlets/proxy/halo-proxy.ts#L29)

## Accessors

### info

• `get` **info**(): [`HaloInfo`](../interfaces/dxos_client.HaloInfo.md)

#### Returns

[`HaloInfo`](../interfaces/dxos_client.HaloInfo.md)

#### Implementation of

[Halo](../interfaces/dxos_client.Halo.md).[info](../interfaces/dxos_client.Halo.md#info)

#### Defined in

[packages/sdk/client/src/packlets/proxy/halo-proxy.ts:42](https://github.com/dxos/dxos/blob/e3b936721/packages/sdk/client/src/packlets/proxy/halo-proxy.ts#L42)

___

### invitationProxy

• `get` **invitationProxy**(): [`InvitationProxy`](dxos_client.InvitationProxy.md)

#### Returns

[`InvitationProxy`](dxos_client.InvitationProxy.md)

#### Defined in

[packages/sdk/client/src/packlets/proxy/halo-proxy.ts:48](https://github.com/dxos/dxos/blob/e3b936721/packages/sdk/client/src/packlets/proxy/halo-proxy.ts#L48)

___

### profile

• `get` **profile**(): `undefined` \| [`Profile`](../interfaces/dxos_client.Profile.md)

User profile info.

#### Returns

`undefined` \| [`Profile`](../interfaces/dxos_client.Profile.md)

#### Implementation of

Halo.profile

#### Defined in

[packages/sdk/client/src/packlets/proxy/halo-proxy.ts:55](https://github.com/dxos/dxos/blob/e3b936721/packages/sdk/client/src/packlets/proxy/halo-proxy.ts#L55)

## Methods

### acceptInvitation

▸ **acceptInvitation**(`invitationDescriptor`): [`Invitation`](dxos_client.Invitation.md)<`void`\>

Joins an existing identity HALO by invitation.
Used to authorize another device of the same user.
The Invitation flow requires the inviter device and invitee device to be online at the same time.
The invitation flow is protected by a generated pin code.

To be used with `client.halo.createHaloInvitation` on the inviter side.

#### Parameters

| Name | Type |
| :------ | :------ |
| `invitationDescriptor` | [`InvitationDescriptor`](dxos_client.InvitationDescriptor.md) |

#### Returns

[`Invitation`](dxos_client.Invitation.md)<`void`\>

#### Implementation of

[Halo](../interfaces/dxos_client.Halo.md).[acceptInvitation](../interfaces/dxos_client.Halo.md#acceptinvitation)

#### Defined in

[packages/sdk/client/src/packlets/proxy/halo-proxy.ts:131](https://github.com/dxos/dxos/blob/e3b936721/packages/sdk/client/src/packlets/proxy/halo-proxy.ts#L131)

___

### addKeyRecord

▸ **addKeyRecord**(`keyRecord`): `Promise`<`void`\>

#### Parameters

| Name | Type |
| :------ | :------ |
| `keyRecord` | [`KeyRecord`](../interfaces/dxos_client.KeyRecord.md) |

#### Returns

`Promise`<`void`\>

#### Implementation of

[Halo](../interfaces/dxos_client.Halo.md).[addKeyRecord](../interfaces/dxos_client.Halo.md#addkeyrecord)

#### Defined in

[packages/sdk/client/src/packlets/proxy/halo-proxy.ts:157](https://github.com/dxos/dxos/blob/e3b936721/packages/sdk/client/src/packlets/proxy/halo-proxy.ts#L157)

___

### createInvitation

▸ **createInvitation**(): `Promise`<[`InvitationRequest`](dxos_client.InvitationRequest.md)\>

Creates an invitation to an existing HALO party.
Used to authorize another device of the same user.
The Invitation flow requires the inviter device and invitee device to be online at the same time.
The invitation flow is protected by a generated pin code.

To be used with `client.halo.joinHaloInvitation` on the invitee side.

#### Returns

`Promise`<[`InvitationRequest`](dxos_client.InvitationRequest.md)\>

#### Implementation of

[Halo](../interfaces/dxos_client.Halo.md).[createInvitation](../interfaces/dxos_client.Halo.md#createinvitation)

#### Defined in

[packages/sdk/client/src/packlets/proxy/halo-proxy.ts:118](https://github.com/dxos/dxos/blob/e3b936721/packages/sdk/client/src/packlets/proxy/halo-proxy.ts#L118)

___

### createProfile

▸ **createProfile**(`__namedParameters?`): `Promise`<[`Profile`](../interfaces/dxos_client.Profile.md)\>

Create Profile.
Add Identity key if public and secret key are provided.
Then initializes profile with given username.
If no public and secret key or seedphrase are provided it relies on keyring to contain an identity key.
Seedphrase must not be specified with existing keys.

#### Parameters

| Name | Type |
| :------ | :------ |
| `__namedParameters` | `CreateProfileOptions` |

#### Returns

`Promise`<[`Profile`](../interfaces/dxos_client.Profile.md)\>

User profile info.

#### Implementation of

[Halo](../interfaces/dxos_client.Halo.md).[createProfile](../interfaces/dxos_client.Halo.md#createprofile)

#### Defined in

[packages/sdk/client/src/packlets/proxy/halo-proxy.ts:75](https://github.com/dxos/dxos/blob/e3b936721/packages/sdk/client/src/packlets/proxy/halo-proxy.ts#L75)

___

### getDevicePreference

▸ **getDevicePreference**(`key`): `Promise`<`undefined` \| `string`\>

#### Parameters

| Name | Type |
| :------ | :------ |
| `key` | `string` |

#### Returns

`Promise`<`undefined` \| `string`\>

#### Implementation of

[Halo](../interfaces/dxos_client.Halo.md).[getDevicePreference](../interfaces/dxos_client.Halo.md#getdevicepreference)

#### Defined in

[packages/sdk/client/src/packlets/proxy/halo-proxy.ts:170](https://github.com/dxos/dxos/blob/e3b936721/packages/sdk/client/src/packlets/proxy/halo-proxy.ts#L170)

___

### getGlobalPreference

▸ **getGlobalPreference**(`key`): `Promise`<`undefined` \| `string`\>

#### Parameters

| Name | Type |
| :------ | :------ |
| `key` | `string` |

#### Returns

`Promise`<`undefined` \| `string`\>

#### Implementation of

[Halo](../interfaces/dxos_client.Halo.md).[getGlobalPreference](../interfaces/dxos_client.Halo.md#getglobalpreference)

#### Defined in

[packages/sdk/client/src/packlets/proxy/halo-proxy.ts:178](https://github.com/dxos/dxos/blob/e3b936721/packages/sdk/client/src/packlets/proxy/halo-proxy.ts#L178)

___

### queryContacts

▸ **queryContacts**(): [`ResultSet`](dxos_client.ResultSet.md)<[`PartyMember`](../interfaces/dxos_client.PartyMember.md)\>

Query for contacts. Contacts represent member keys across all known Parties.

#### Returns

[`ResultSet`](dxos_client.ResultSet.md)<[`PartyMember`](../interfaces/dxos_client.PartyMember.md)\>

#### Implementation of

[Halo](../interfaces/dxos_client.Halo.md).[queryContacts](../interfaces/dxos_client.Halo.md#querycontacts)

#### Defined in

[packages/sdk/client/src/packlets/proxy/halo-proxy.ts:106](https://github.com/dxos/dxos/blob/e3b936721/packages/sdk/client/src/packlets/proxy/halo-proxy.ts#L106)

___

### queryDevices

▸ **queryDevices**(): `Promise`<`DeviceInfo`[]\>

#### Returns

`Promise`<`DeviceInfo`[]\>

#### Implementation of

[Halo](../interfaces/dxos_client.Halo.md).[queryDevices](../interfaces/dxos_client.Halo.md#querydevices)

#### Defined in

[packages/sdk/client/src/packlets/proxy/halo-proxy.ts:162](https://github.com/dxos/dxos/blob/e3b936721/packages/sdk/client/src/packlets/proxy/halo-proxy.ts#L162)

___

### recoverProfile

▸ **recoverProfile**(`seedPhrase`): `Promise`<[`Profile`](../interfaces/dxos_client.Profile.md)\>

Joins an existing identity HALO from a recovery seed phrase.

#### Parameters

| Name | Type |
| :------ | :------ |
| `seedPhrase` | `string` |

#### Returns

`Promise`<[`Profile`](../interfaces/dxos_client.Profile.md)\>

#### Implementation of

[Halo](../interfaces/dxos_client.Halo.md).[recoverProfile](../interfaces/dxos_client.Halo.md#recoverprofile)

#### Defined in

[packages/sdk/client/src/packlets/proxy/halo-proxy.ts:98](https://github.com/dxos/dxos/blob/e3b936721/packages/sdk/client/src/packlets/proxy/halo-proxy.ts#L98)

___

### setDevicePreference

▸ **setDevicePreference**(`key`, `value`): `Promise`<`void`\>

#### Parameters

| Name | Type |
| :------ | :------ |
| `key` | `string` |
| `value` | `string` |

#### Returns

`Promise`<`void`\>

#### Implementation of

[Halo](../interfaces/dxos_client.Halo.md).[setDevicePreference](../interfaces/dxos_client.Halo.md#setdevicepreference)

#### Defined in

[packages/sdk/client/src/packlets/proxy/halo-proxy.ts:166](https://github.com/dxos/dxos/blob/e3b936721/packages/sdk/client/src/packlets/proxy/halo-proxy.ts#L166)

___

### setGlobalPreference

▸ **setGlobalPreference**(`key`, `value`): `Promise`<`void`\>

#### Parameters

| Name | Type |
| :------ | :------ |
| `key` | `string` |
| `value` | `string` |

#### Returns

`Promise`<`void`\>

#### Implementation of

[Halo](../interfaces/dxos_client.Halo.md).[setGlobalPreference](../interfaces/dxos_client.Halo.md#setglobalpreference)

#### Defined in

[packages/sdk/client/src/packlets/proxy/halo-proxy.ts:174](https://github.com/dxos/dxos/blob/e3b936721/packages/sdk/client/src/packlets/proxy/halo-proxy.ts#L174)

___

### sign

▸ **sign**(`request`): `Promise`<[`SignResponse`](../interfaces/dxos_client.SignResponse.md)\>

#### Parameters

| Name | Type |
| :------ | :------ |
| `request` | [`SignRequest`](../interfaces/dxos_client.SignRequest.md) |

#### Returns

`Promise`<[`SignResponse`](../interfaces/dxos_client.SignResponse.md)\>

#### Implementation of

[Halo](../interfaces/dxos_client.Halo.md).[sign](../interfaces/dxos_client.Halo.md#sign)

#### Defined in

[packages/sdk/client/src/packlets/proxy/halo-proxy.ts:153](https://github.com/dxos/dxos/blob/e3b936721/packages/sdk/client/src/packlets/proxy/halo-proxy.ts#L153)

___

### subscribeToProfile

▸ **subscribeToProfile**(`callback`): () => `void`

**`Deprecated`**

#### Parameters

| Name | Type |
| :------ | :------ |
| `callback` | (`profile`: [`Profile`](../interfaces/dxos_client.Profile.md)) => `void` |

#### Returns

`fn`

▸ (): `void`

**`Deprecated`**

##### Returns

`void`

#### Implementation of

[Halo](../interfaces/dxos_client.Halo.md).[subscribeToProfile](../interfaces/dxos_client.Halo.md#subscribetoprofile)

#### Defined in

[packages/sdk/client/src/packlets/proxy/halo-proxy.ts:63](https://github.com/dxos/dxos/blob/e3b936721/packages/sdk/client/src/packlets/proxy/halo-proxy.ts#L63)

___

### toString

▸ **toString**(): `string`

#### Returns

`string`

#### Defined in

[packages/sdk/client/src/packlets/proxy/halo-proxy.ts:38](https://github.com/dxos/dxos/blob/e3b936721/packages/sdk/client/src/packlets/proxy/halo-proxy.ts#L38)
