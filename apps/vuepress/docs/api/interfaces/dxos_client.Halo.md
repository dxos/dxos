# Interface: Halo

[@dxos/client](../modules/dxos_client.md).Halo

HALO API.

## Implemented by

- [`HaloProxy`](../classes/dxos_client.HaloProxy.md)

## Properties

### info

 **info**: `Object`

#### Type declaration

| Name | Type |
| :------ | :------ |
| `key?` | `PublicKey` |

#### Defined in

[packages/sdk/client/src/packlets/api/halo.ts:25](https://github.com/dxos/dxos/blob/db8188dae/packages/sdk/client/src/packlets/api/halo.ts#L25)

## Accessors

### profile

`get` **profile**(): `undefined` \| [`Profile`](dxos_client.Profile.md)

#### Returns

`undefined` \| [`Profile`](dxos_client.Profile.md)

#### Defined in

[packages/sdk/client/src/packlets/api/halo.ts:27](https://github.com/dxos/dxos/blob/db8188dae/packages/sdk/client/src/packlets/api/halo.ts#L27)

## Methods

### acceptInvitation

**acceptInvitation**(`invitationDescriptor`): [`Invitation`](../classes/dxos_client.Invitation.md)<`void`\>

#### Parameters

| Name | Type |
| :------ | :------ |
| `invitationDescriptor` | [`InvitationDescriptor`](../classes/dxos_client.InvitationDescriptor.md) |

#### Returns

[`Invitation`](../classes/dxos_client.Invitation.md)<`void`\>

#### Defined in

[packages/sdk/client/src/packlets/api/halo.ts:41](https://github.com/dxos/dxos/blob/db8188dae/packages/sdk/client/src/packlets/api/halo.ts#L41)

___

### addKeyRecord

**addKeyRecord**(`keyRecord`): `Promise`<`void`\>

#### Parameters

| Name | Type |
| :------ | :------ |
| `keyRecord` | [`KeyRecord`](dxos_client.KeyRecord.md) |

#### Returns

`Promise`<`void`\>

#### Defined in

[packages/sdk/client/src/packlets/api/halo.ts:32](https://github.com/dxos/dxos/blob/db8188dae/packages/sdk/client/src/packlets/api/halo.ts#L32)

___

### createInvitation

**createInvitation**(): `Promise`<[`InvitationRequest`](../classes/dxos_client.InvitationRequest.md)\>

#### Returns

`Promise`<[`InvitationRequest`](../classes/dxos_client.InvitationRequest.md)\>

#### Defined in

[packages/sdk/client/src/packlets/api/halo.ts:40](https://github.com/dxos/dxos/blob/db8188dae/packages/sdk/client/src/packlets/api/halo.ts#L40)

___

### createProfile

**createProfile**(`options?`): `Promise`<[`Profile`](dxos_client.Profile.md)\>

#### Parameters

| Name | Type |
| :------ | :------ |
| `options?` | `CreateProfileOptions` |

#### Returns

`Promise`<[`Profile`](dxos_client.Profile.md)\>

#### Defined in

[packages/sdk/client/src/packlets/api/halo.ts:28](https://github.com/dxos/dxos/blob/db8188dae/packages/sdk/client/src/packlets/api/halo.ts#L28)

___

### getDevicePreference

**getDevicePreference**(`key`): `Promise`<`undefined` \| `string`\>

#### Parameters

| Name | Type |
| :------ | :------ |
| `key` | `string` |

#### Returns

`Promise`<`undefined` \| `string`\>

#### Defined in

[packages/sdk/client/src/packlets/api/halo.ts:45](https://github.com/dxos/dxos/blob/db8188dae/packages/sdk/client/src/packlets/api/halo.ts#L45)

___

### getGlobalPreference

**getGlobalPreference**(`key`): `Promise`<`undefined` \| `string`\>

#### Parameters

| Name | Type |
| :------ | :------ |
| `key` | `string` |

#### Returns

`Promise`<`undefined` \| `string`\>

#### Defined in

[packages/sdk/client/src/packlets/api/halo.ts:48](https://github.com/dxos/dxos/blob/db8188dae/packages/sdk/client/src/packlets/api/halo.ts#L48)

___

### queryContacts

**queryContacts**(): [`ResultSet`](../classes/dxos_client.ResultSet.md)<[`PartyMember`](dxos_client.PartyMember.md)\>

#### Returns

[`ResultSet`](../classes/dxos_client.ResultSet.md)<[`PartyMember`](dxos_client.PartyMember.md)\>

#### Defined in

[packages/sdk/client/src/packlets/api/halo.ts:39](https://github.com/dxos/dxos/blob/db8188dae/packages/sdk/client/src/packlets/api/halo.ts#L39)

___

### queryDevices

**queryDevices**(): `Promise`<`DeviceInfo`[]\>

#### Returns

`Promise`<`DeviceInfo`[]\>

#### Defined in

[packages/sdk/client/src/packlets/api/halo.ts:43](https://github.com/dxos/dxos/blob/db8188dae/packages/sdk/client/src/packlets/api/halo.ts#L43)

___

### recoverProfile

**recoverProfile**(`seedPhrase`): `Promise`<[`Profile`](dxos_client.Profile.md)\>

#### Parameters

| Name | Type |
| :------ | :------ |
| `seedPhrase` | `string` |

#### Returns

`Promise`<[`Profile`](dxos_client.Profile.md)\>

#### Defined in

[packages/sdk/client/src/packlets/api/halo.ts:29](https://github.com/dxos/dxos/blob/db8188dae/packages/sdk/client/src/packlets/api/halo.ts#L29)

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

#### Defined in

[packages/sdk/client/src/packlets/api/halo.ts:44](https://github.com/dxos/dxos/blob/db8188dae/packages/sdk/client/src/packlets/api/halo.ts#L44)

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

#### Defined in

[packages/sdk/client/src/packlets/api/halo.ts:47](https://github.com/dxos/dxos/blob/db8188dae/packages/sdk/client/src/packlets/api/halo.ts#L47)

___

### sign

**sign**(`request`): `Promise`<[`SignResponse`](dxos_client.SignResponse.md)\>

#### Parameters

| Name | Type |
| :------ | :------ |
| `request` | [`SignRequest`](dxos_client.SignRequest.md) |

#### Returns

`Promise`<[`SignResponse`](dxos_client.SignResponse.md)\>

#### Defined in

[packages/sdk/client/src/packlets/api/halo.ts:31](https://github.com/dxos/dxos/blob/db8188dae/packages/sdk/client/src/packlets/api/halo.ts#L31)

___

### subscribeToProfile

**subscribeToProfile**(`callback`): `void`

**`Deprecated`**

#### Parameters

| Name | Type |
| :------ | :------ |
| `callback` | (`profile`: [`Profile`](dxos_client.Profile.md)) => `void` |

#### Returns

`void`

#### Defined in

[packages/sdk/client/src/packlets/api/halo.ts:37](https://github.com/dxos/dxos/blob/db8188dae/packages/sdk/client/src/packlets/api/halo.ts#L37)
