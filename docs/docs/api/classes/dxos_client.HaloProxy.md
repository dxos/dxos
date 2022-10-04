# Class: HaloProxy

[@dxos/client](../modules/dxos_client.md).HaloProxy

Client proxy to local/remote HALO service.

## Implements

- [`Halo`](../interfaces/dxos_client.Halo.md)

## Constructors

### constructor

**new HaloProxy**(`_serviceProvider`)

#### Parameters

| Name | Type |
| :------ | :------ |
| `_serviceProvider` | `ClientServiceProvider` |

#### Defined in

[packages/sdk/client/src/packlets/proxies/halo-proxy.ts:36](https://github.com/dxos/dxos/blob/main/packages/sdk/client/src/packlets/proxies/halo-proxy.ts#L36)

## Properties

### \_contacts

 `Private` **\_contacts**: `any`[] = `[]`

#### Defined in

[packages/sdk/client/src/packlets/proxies/halo-proxy.ts:34](https://github.com/dxos/dxos/blob/main/packages/sdk/client/src/packlets/proxies/halo-proxy.ts#L34)

___

### \_contactsChanged

 `Private` `Readonly` **\_contactsChanged**: `Event`<`void`\>

#### Defined in

[packages/sdk/client/src/packlets/proxies/halo-proxy.ts:30](https://github.com/dxos/dxos/blob/main/packages/sdk/client/src/packlets/proxies/halo-proxy.ts#L30)

___

### \_invitationProxy

 `Private` `Readonly` **\_invitationProxy**: [`InvitationProxy`](dxos_client.InvitationProxy.md)

#### Defined in

[packages/sdk/client/src/packlets/proxies/halo-proxy.ts:27](https://github.com/dxos/dxos/blob/main/packages/sdk/client/src/packlets/proxies/halo-proxy.ts#L27)

___

### \_profile

 `Private` `Optional` **\_profile**: [`Profile`](../interfaces/dxos_client.Profile.md)

#### Defined in

[packages/sdk/client/src/packlets/proxies/halo-proxy.ts:33](https://github.com/dxos/dxos/blob/main/packages/sdk/client/src/packlets/proxies/halo-proxy.ts#L33)

___

### \_subscriptions

 `Private` `Readonly` **\_subscriptions**: `SubscriptionGroup`

#### Defined in

[packages/sdk/client/src/packlets/proxies/halo-proxy.ts:28](https://github.com/dxos/dxos/blob/main/packages/sdk/client/src/packlets/proxies/halo-proxy.ts#L28)

___

### profileChanged

 `Readonly` **profileChanged**: `Event`<`void`\>

#### Defined in

[packages/sdk/client/src/packlets/proxies/halo-proxy.ts:31](https://github.com/dxos/dxos/blob/main/packages/sdk/client/src/packlets/proxies/halo-proxy.ts#L31)

## Accessors

### info

`get` **info**(): [`HaloInfo`](../interfaces/dxos_client.HaloInfo.md)

#### Returns

[`HaloInfo`](../interfaces/dxos_client.HaloInfo.md)

#### Implementation of

[Halo](../interfaces/dxos_client.Halo.md).[info](../interfaces/dxos_client.Halo.md#info)

#### Defined in

[packages/sdk/client/src/packlets/proxies/halo-proxy.ts:44](https://github.com/dxos/dxos/blob/main/packages/sdk/client/src/packlets/proxies/halo-proxy.ts#L44)

___

### invitationProxy

`get` **invitationProxy**(): [`InvitationProxy`](dxos_client.InvitationProxy.md)

#### Returns

[`InvitationProxy`](dxos_client.InvitationProxy.md)

#### Defined in

[packages/sdk/client/src/packlets/proxies/halo-proxy.ts:50](https://github.com/dxos/dxos/blob/main/packages/sdk/client/src/packlets/proxies/halo-proxy.ts#L50)

___

### profile

`get` **profile**(): `undefined` \| [`Profile`](../interfaces/dxos_client.Profile.md)

User profile info.

#### Returns

`undefined` \| [`Profile`](../interfaces/dxos_client.Profile.md)

#### Implementation of

Halo.profile

#### Defined in

[packages/sdk/client/src/packlets/proxies/halo-proxy.ts:57](https://github.com/dxos/dxos/blob/main/packages/sdk/client/src/packlets/proxies/halo-proxy.ts#L57)

## Methods

### acceptInvitation

**acceptInvitation**(`invitationDescriptor`): [`Invitation`](dxos_client.Invitation.md)<`void`\>

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

[packages/sdk/client/src/packlets/proxies/halo-proxy.ts:133](https://github.com/dxos/dxos/blob/main/packages/sdk/client/src/packlets/proxies/halo-proxy.ts#L133)

___

### addKeyRecord

**addKeyRecord**(`keyRecord`): `Promise`<`void`\>

#### Parameters

| Name | Type |
| :------ | :------ |
| `keyRecord` | [`KeyRecord`](../interfaces/dxos_client.KeyRecord.md) |

#### Returns

`Promise`<`void`\>

#### Implementation of

[Halo](../interfaces/dxos_client.Halo.md).[addKeyRecord](../interfaces/dxos_client.Halo.md#addkeyrecord)

#### Defined in

[packages/sdk/client/src/packlets/proxies/halo-proxy.ts:159](https://github.com/dxos/dxos/blob/main/packages/sdk/client/src/packlets/proxies/halo-proxy.ts#L159)

___

### createInvitation

**createInvitation**(): `Promise`<[`InvitationRequest`](dxos_client.InvitationRequest.md)\>

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

[packages/sdk/client/src/packlets/proxies/halo-proxy.ts:120](https://github.com/dxos/dxos/blob/main/packages/sdk/client/src/packlets/proxies/halo-proxy.ts#L120)

___

### createProfile

**createProfile**(`__namedParameters?`): `Promise`<[`Profile`](../interfaces/dxos_client.Profile.md)\>

Create Profile.
Add Identity key if public and secret key are provided.
Then initializes profile with given username.
If no public and secret key or seedphrase are provided it relies on keyring to contain an identity key.
Seedphrase must not be specified with existing keys.

#### Parameters

| Name | Type |
| :------ | :------ |
| `__namedParameters` | `any` |

#### Returns

`Promise`<[`Profile`](../interfaces/dxos_client.Profile.md)\>

User profile info.

#### Implementation of

[Halo](../interfaces/dxos_client.Halo.md).[createProfile](../interfaces/dxos_client.Halo.md#createprofile)

#### Defined in

[packages/sdk/client/src/packlets/proxies/halo-proxy.ts:77](https://github.com/dxos/dxos/blob/main/packages/sdk/client/src/packlets/proxies/halo-proxy.ts#L77)

___

### getDevicePreference

**getDevicePreference**(`key`): `Promise`<`undefined` \| `string`\>

#### Parameters

| Name | Type |
| :------ | :------ |
| `key` | `string` |

#### Returns

`Promise`<`undefined` \| `string`\>

#### Implementation of

[Halo](../interfaces/dxos_client.Halo.md).[getDevicePreference](../interfaces/dxos_client.Halo.md#getdevicepreference)

#### Defined in

[packages/sdk/client/src/packlets/proxies/halo-proxy.ts:172](https://github.com/dxos/dxos/blob/main/packages/sdk/client/src/packlets/proxies/halo-proxy.ts#L172)

___

### getGlobalPreference

**getGlobalPreference**(`key`): `Promise`<`undefined` \| `string`\>

#### Parameters

| Name | Type |
| :------ | :------ |
| `key` | `string` |

#### Returns

`Promise`<`undefined` \| `string`\>

#### Implementation of

[Halo](../interfaces/dxos_client.Halo.md).[getGlobalPreference](../interfaces/dxos_client.Halo.md#getglobalpreference)

#### Defined in

[packages/sdk/client/src/packlets/proxies/halo-proxy.ts:180](https://github.com/dxos/dxos/blob/main/packages/sdk/client/src/packlets/proxies/halo-proxy.ts#L180)

___

### queryContacts

**queryContacts**(): [`ResultSet`](dxos_client.ResultSet.md)<`any`\>

Query for contacts. Contacts represent member keys across all known Parties.

#### Returns

[`ResultSet`](dxos_client.ResultSet.md)<`any`\>

#### Implementation of

[Halo](../interfaces/dxos_client.Halo.md).[queryContacts](../interfaces/dxos_client.Halo.md#querycontacts)

#### Defined in

[packages/sdk/client/src/packlets/proxies/halo-proxy.ts:108](https://github.com/dxos/dxos/blob/main/packages/sdk/client/src/packlets/proxies/halo-proxy.ts#L108)

___

### queryDevices

**queryDevices**(): `Promise`<`DeviceInfo`[]\>

#### Returns

`Promise`<`DeviceInfo`[]\>

#### Implementation of

[Halo](../interfaces/dxos_client.Halo.md).[queryDevices](../interfaces/dxos_client.Halo.md#querydevices)

#### Defined in

[packages/sdk/client/src/packlets/proxies/halo-proxy.ts:164](https://github.com/dxos/dxos/blob/main/packages/sdk/client/src/packlets/proxies/halo-proxy.ts#L164)

___

### recoverProfile

**recoverProfile**(`seedPhrase`): `Promise`<[`Profile`](../interfaces/dxos_client.Profile.md)\>

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

[packages/sdk/client/src/packlets/proxies/halo-proxy.ts:100](https://github.com/dxos/dxos/blob/main/packages/sdk/client/src/packlets/proxies/halo-proxy.ts#L100)

___

### setDevicePreference

**setDevicePreference**(`key`, `value`): `Promise`<`void`\>

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

[packages/sdk/client/src/packlets/proxies/halo-proxy.ts:168](https://github.com/dxos/dxos/blob/main/packages/sdk/client/src/packlets/proxies/halo-proxy.ts#L168)

___

### setGlobalPreference

**setGlobalPreference**(`key`, `value`): `Promise`<`void`\>

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

[packages/sdk/client/src/packlets/proxies/halo-proxy.ts:176](https://github.com/dxos/dxos/blob/main/packages/sdk/client/src/packlets/proxies/halo-proxy.ts#L176)

___

### sign

**sign**(`request`): `Promise`<[`SignResponse`](../interfaces/dxos_client.SignResponse.md)\>

#### Parameters

| Name | Type |
| :------ | :------ |
| `request` | [`SignRequest`](../interfaces/dxos_client.SignRequest.md) |

#### Returns

`Promise`<[`SignResponse`](../interfaces/dxos_client.SignResponse.md)\>

#### Implementation of

[Halo](../interfaces/dxos_client.Halo.md).[sign](../interfaces/dxos_client.Halo.md#sign)

#### Defined in

[packages/sdk/client/src/packlets/proxies/halo-proxy.ts:155](https://github.com/dxos/dxos/blob/main/packages/sdk/client/src/packlets/proxies/halo-proxy.ts#L155)

___

### subscribeToProfile

**subscribeToProfile**(`callback`): () => `void`

**`Deprecated`**

#### Parameters

| Name | Type |
| :------ | :------ |
| `callback` | (`profile`: [`Profile`](../interfaces/dxos_client.Profile.md)) => `void` |

#### Returns

`fn`

(): `void`

**`Deprecated`**

##### Returns

`void`

#### Implementation of

[Halo](../interfaces/dxos_client.Halo.md).[subscribeToProfile](../interfaces/dxos_client.Halo.md#subscribetoprofile)

#### Defined in

[packages/sdk/client/src/packlets/proxies/halo-proxy.ts:65](https://github.com/dxos/dxos/blob/main/packages/sdk/client/src/packlets/proxies/halo-proxy.ts#L65)

___

### toString

**toString**(): `string`

#### Returns

`string`

#### Defined in

[packages/sdk/client/src/packlets/proxies/halo-proxy.ts:40](https://github.com/dxos/dxos/blob/main/packages/sdk/client/src/packlets/proxies/halo-proxy.ts#L40)
