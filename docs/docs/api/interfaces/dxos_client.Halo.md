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
| `key?` | [`PublicKey`](../classes/dxos_client.PublicKey.md) |

#### Defined in

[packages/sdk/client/src/packlets/api/halo.ts:21](https://github.com/dxos/dxos/blob/main/packages/sdk/client/src/packlets/api/halo.ts#L21)

## Accessors

### profile

`get` **profile**(): `undefined` \| [`Profile`](dxos_client.Profile.md)

#### Returns

`undefined` \| [`Profile`](dxos_client.Profile.md)

#### Defined in

[packages/sdk/client/src/packlets/api/halo.ts:23](https://github.com/dxos/dxos/blob/main/packages/sdk/client/src/packlets/api/halo.ts#L23)

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

[packages/sdk/client/src/packlets/api/halo.ts:37](https://github.com/dxos/dxos/blob/main/packages/sdk/client/src/packlets/api/halo.ts#L37)

___

### addKeyRecord

**addKeyRecord**(`key_record`): `Promise`<`void`\>

#### Parameters

| Name | Type |
| :------ | :------ |
| `key_record` | [`KeyRecord`](dxos_client.KeyRecord.md) |

#### Returns

`Promise`<`void`\>

#### Defined in

[packages/sdk/client/src/packlets/api/halo.ts:28](https://github.com/dxos/dxos/blob/main/packages/sdk/client/src/packlets/api/halo.ts#L28)

___

### createInvitation

**createInvitation**(): `Promise`<[`InvitationRequest`](../classes/dxos_client.InvitationRequest.md)\>

#### Returns

`Promise`<[`InvitationRequest`](../classes/dxos_client.InvitationRequest.md)\>

#### Defined in

[packages/sdk/client/src/packlets/api/halo.ts:36](https://github.com/dxos/dxos/blob/main/packages/sdk/client/src/packlets/api/halo.ts#L36)

___

### createProfile

**createProfile**(`options?`): `Promise`<[`Profile`](dxos_client.Profile.md)\>

#### Parameters

| Name | Type |
| :------ | :------ |
| `options?` | `any` |

#### Returns

`Promise`<[`Profile`](dxos_client.Profile.md)\>

#### Defined in

[packages/sdk/client/src/packlets/api/halo.ts:24](https://github.com/dxos/dxos/blob/main/packages/sdk/client/src/packlets/api/halo.ts#L24)

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

[packages/sdk/client/src/packlets/api/halo.ts:41](https://github.com/dxos/dxos/blob/main/packages/sdk/client/src/packlets/api/halo.ts#L41)

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

[packages/sdk/client/src/packlets/api/halo.ts:44](https://github.com/dxos/dxos/blob/main/packages/sdk/client/src/packlets/api/halo.ts#L44)

___

### queryContacts

**queryContacts**(): [`ResultSet`](../classes/dxos_client.ResultSet.md)<`any`\>

#### Returns

[`ResultSet`](../classes/dxos_client.ResultSet.md)<`any`\>

#### Defined in

[packages/sdk/client/src/packlets/api/halo.ts:35](https://github.com/dxos/dxos/blob/main/packages/sdk/client/src/packlets/api/halo.ts#L35)

___

### queryDevices

**queryDevices**(): `Promise`<`DeviceInfo`[]\>

#### Returns

`Promise`<`DeviceInfo`[]\>

#### Defined in

[packages/sdk/client/src/packlets/api/halo.ts:39](https://github.com/dxos/dxos/blob/main/packages/sdk/client/src/packlets/api/halo.ts#L39)

___

### recoverProfile

**recoverProfile**(`seed_phrase`): `Promise`<[`Profile`](dxos_client.Profile.md)\>

#### Parameters

| Name | Type |
| :------ | :------ |
| `seed_phrase` | `string` |

#### Returns

`Promise`<[`Profile`](dxos_client.Profile.md)\>

#### Defined in

[packages/sdk/client/src/packlets/api/halo.ts:25](https://github.com/dxos/dxos/blob/main/packages/sdk/client/src/packlets/api/halo.ts#L25)

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

[packages/sdk/client/src/packlets/api/halo.ts:40](https://github.com/dxos/dxos/blob/main/packages/sdk/client/src/packlets/api/halo.ts#L40)

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

[packages/sdk/client/src/packlets/api/halo.ts:43](https://github.com/dxos/dxos/blob/main/packages/sdk/client/src/packlets/api/halo.ts#L43)

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

[packages/sdk/client/src/packlets/api/halo.ts:27](https://github.com/dxos/dxos/blob/main/packages/sdk/client/src/packlets/api/halo.ts#L27)

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

[packages/sdk/client/src/packlets/api/halo.ts:33](https://github.com/dxos/dxos/blob/main/packages/sdk/client/src/packlets/api/halo.ts#L33)
