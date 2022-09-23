---
id: "dxos_echo_db.Preferences"
title: "Class: Preferences"
sidebar_label: "Preferences"
custom_edit_url: null
---

[@dxos/echo-db](../modules/dxos_echo_db.md).Preferences

Manage settings.

## Constructors

### constructor

• **new Preferences**(`_getDatabase`, `_deviceKey`)

#### Parameters

| Name | Type |
| :------ | :------ |
| `_getDatabase` | () => `undefined` \| [`Database`](dxos_echo_db.Database.md) |
| `_deviceKey` | `PublicKey` |

#### Defined in

[packages/echo/echo-db/src/halo/preferences.ts:27](https://github.com/dxos/dxos/blob/b06737400/packages/echo/echo-db/src/halo/preferences.ts#L27)

## Accessors

### values

• `get` **values**(): `any`

#### Returns

`any`

#### Defined in

[packages/echo/echo-db/src/halo/preferences.ts:32](https://github.com/dxos/dxos/blob/b06737400/packages/echo/echo-db/src/halo/preferences.ts#L32)

## Methods

### \_getPartyPreference

▸ **_getPartyPreference**(`preferences`, `partyKey`, `key`): `any`

#### Parameters

| Name | Type |
| :------ | :------ |
| `preferences` | [`Item`](dxos_echo_db.Item.md)<`any`\> |
| `partyKey` | `PublicKey` |
| `key` | `string` |

#### Returns

`any`

#### Defined in

[packages/echo/echo-db/src/halo/preferences.ts:122](https://github.com/dxos/dxos/blob/b06737400/packages/echo/echo-db/src/halo/preferences.ts#L122)

___

### \_setPartyPreference

▸ **_setPartyPreference**(`preferences`, `party`, `key`, `value`): `Promise`<`void`\>

#### Parameters

| Name | Type |
| :------ | :------ |
| `preferences` | [`Item`](dxos_echo_db.Item.md)<`any`\> |
| `party` | [`DataParty`](dxos_echo_db.DataParty.md) |
| `key` | `string` |
| `value` | `any` |

#### Returns

`Promise`<`void`\>

#### Defined in

[packages/echo/echo-db/src/halo/preferences.ts:129](https://github.com/dxos/dxos/blob/b06737400/packages/echo/echo-db/src/halo/preferences.ts#L129)

___

### getDevicePartyPreference

▸ **getDevicePartyPreference**(`partyKey`, `key`): `any`

#### Parameters

| Name | Type |
| :------ | :------ |
| `partyKey` | `PublicKey` |
| `key` | `string` |

#### Returns

`any`

#### Defined in

[packages/echo/echo-db/src/halo/preferences.ts:109](https://github.com/dxos/dxos/blob/b06737400/packages/echo/echo-db/src/halo/preferences.ts#L109)

___

### getDevicePreferences

▸ **getDevicePreferences**(): `undefined` \| [`Item`](dxos_echo_db.Item.md)<`any`\>

#### Returns

`undefined` \| [`Item`](dxos_echo_db.Item.md)<`any`\>

#### Defined in

[packages/echo/echo-db/src/halo/preferences.ts:88](https://github.com/dxos/dxos/blob/b06737400/packages/echo/echo-db/src/halo/preferences.ts#L88)

___

### getGlobalPartyPreference

▸ **getGlobalPartyPreference**(`partyKey`, `key`): `any`

#### Parameters

| Name | Type |
| :------ | :------ |
| `partyKey` | `PublicKey` |
| `key` | `string` |

#### Returns

`any`

#### Defined in

[packages/echo/echo-db/src/halo/preferences.ts:97](https://github.com/dxos/dxos/blob/b06737400/packages/echo/echo-db/src/halo/preferences.ts#L97)

___

### getGlobalPreferences

▸ **getGlobalPreferences**(): `undefined` \| [`Item`](dxos_echo_db.Item.md)<`any`\>

#### Returns

`undefined` \| [`Item`](dxos_echo_db.Item.md)<`any`\>

#### Defined in

[packages/echo/echo-db/src/halo/preferences.ts:79](https://github.com/dxos/dxos/blob/b06737400/packages/echo/echo-db/src/halo/preferences.ts#L79)

___

### isPartyActive

▸ **isPartyActive**(`partyKey`): `any`

#### Parameters

| Name | Type |
| :------ | :------ |
| `partyKey` | `PublicKey` |

#### Returns

`any`

#### Defined in

[packages/echo/echo-db/src/halo/preferences.ts:40](https://github.com/dxos/dxos/blob/b06737400/packages/echo/echo-db/src/halo/preferences.ts#L40)

___

### recordPartyJoining

▸ **recordPartyJoining**(`joinedParty`): `Promise`<`void`\>

#### Parameters

| Name | Type |
| :------ | :------ |
| `joinedParty` | [`JoinedParty`](../modules/dxos_echo_db.md#joinedparty) |

#### Returns

`Promise`<`void`\>

#### Defined in

[packages/echo/echo-db/src/halo/preferences.ts:137](https://github.com/dxos/dxos/blob/b06737400/packages/echo/echo-db/src/halo/preferences.ts#L137)

___

### setDevicePartyPreference

▸ **setDevicePartyPreference**(`party`, `key`, `value`): `Promise`<`void`\>

#### Parameters

| Name | Type |
| :------ | :------ |
| `party` | [`DataParty`](dxos_echo_db.DataParty.md) |
| `key` | `string` |
| `value` | `any` |

#### Returns

`Promise`<`void`\>

#### Defined in

[packages/echo/echo-db/src/halo/preferences.ts:115](https://github.com/dxos/dxos/blob/b06737400/packages/echo/echo-db/src/halo/preferences.ts#L115)

___

### setGlobalPartyPreference

▸ **setGlobalPartyPreference**(`party`, `key`, `value`): `Promise`<`void`\>

#### Parameters

| Name | Type |
| :------ | :------ |
| `party` | [`DataParty`](dxos_echo_db.DataParty.md) |
| `key` | `string` |
| `value` | `any` |

#### Returns

`Promise`<`void`\>

#### Defined in

[packages/echo/echo-db/src/halo/preferences.ts:103](https://github.com/dxos/dxos/blob/b06737400/packages/echo/echo-db/src/halo/preferences.ts#L103)

___

### subscribeToJoinedPartyList

▸ **subscribeToJoinedPartyList**(`callback`): () => `void`

#### Parameters

| Name | Type |
| :------ | :------ |
| `callback` | (`parties`: [`JoinedParty`](../modules/dxos_echo_db.md#joinedparty)[]) => `void` |

#### Returns

`fn`

▸ (): `void`

##### Returns

`void`

#### Defined in

[packages/echo/echo-db/src/halo/preferences.ts:160](https://github.com/dxos/dxos/blob/b06737400/packages/echo/echo-db/src/halo/preferences.ts#L160)

___

### subscribeToPreferences

▸ **subscribeToPreferences**(`callback`): () => `void`

#### Parameters

| Name | Type |
| :------ | :------ |
| `callback` | (`preferences`: `any`) => `void` |

#### Returns

`fn`

▸ (): `void`

##### Returns

`void`

#### Defined in

[packages/echo/echo-db/src/halo/preferences.ts:45](https://github.com/dxos/dxos/blob/b06737400/packages/echo/echo-db/src/halo/preferences.ts#L45)
