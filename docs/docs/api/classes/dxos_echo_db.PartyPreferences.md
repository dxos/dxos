# Class: PartyPreferences

[@dxos/echo-db](../modules/dxos_echo_db.md).PartyPreferences

Wrapper for party preferences. Preferences can be global or device specific.

Includes party activation state.

## Constructors

### constructor

**new PartyPreferences**(`_preferences`, `_party`)

#### Parameters

| Name | Type |
| :------ | :------ |
| `_preferences` | [`Preferences`](dxos_echo_db.Preferences.md) |
| `_party` | [`DataParty`](dxos_echo_db.DataParty.md) |

#### Defined in

[packages/echo/echo-db/src/parties/party-preferences.ts:22](https://github.com/dxos/dxos/blob/main/packages/echo/echo-db/src/parties/party-preferences.ts#L22)

## Accessors

### isActive

`get` **isActive**(): `boolean`

#### Returns

`boolean`

#### Defined in

[packages/echo/echo-db/src/parties/party-preferences.ts:29](https://github.com/dxos/dxos/blob/main/packages/echo/echo-db/src/parties/party-preferences.ts#L29)

## Methods

### activate

**activate**(`options`): `Promise`<`void`\>

#### Parameters

| Name | Type |
| :------ | :------ |
| `options` | [`ActivationOptions`](../interfaces/dxos_echo_db.ActivationOptions.md) |

#### Returns

`Promise`<`void`\>

#### Defined in

[packages/echo/echo-db/src/parties/party-preferences.ts:49](https://github.com/dxos/dxos/blob/main/packages/echo/echo-db/src/parties/party-preferences.ts#L49)

___

### deactivate

**deactivate**(`options`): `Promise`<`void`\>

#### Parameters

| Name | Type |
| :------ | :------ |
| `options` | [`ActivationOptions`](../interfaces/dxos_echo_db.ActivationOptions.md) |

#### Returns

`Promise`<`void`\>

#### Defined in

[packages/echo/echo-db/src/parties/party-preferences.ts:61](https://github.com/dxos/dxos/blob/main/packages/echo/echo-db/src/parties/party-preferences.ts#L61)

___

### getDevicePreference

**getDevicePreference**(`property`): `any`

#### Parameters

| Name | Type |
| :------ | :------ |
| `property` | `string` |

#### Returns

`any`

#### Defined in

[packages/echo/echo-db/src/parties/party-preferences.ts:45](https://github.com/dxos/dxos/blob/main/packages/echo/echo-db/src/parties/party-preferences.ts#L45)

___

### getGlobalPreference

**getGlobalPreference**(`property`): `any`

#### Parameters

| Name | Type |
| :------ | :------ |
| `property` | `string` |

#### Returns

`any`

#### Defined in

[packages/echo/echo-db/src/parties/party-preferences.ts:41](https://github.com/dxos/dxos/blob/main/packages/echo/echo-db/src/parties/party-preferences.ts#L41)

___

### getLastKnownTitle

**getLastKnownTitle**(): `any`

#### Returns

`any`

#### Defined in

[packages/echo/echo-db/src/parties/party-preferences.ts:74](https://github.com/dxos/dxos/blob/main/packages/echo/echo-db/src/parties/party-preferences.ts#L74)

___

### setDevicePreference

**setDevicePreference**(`property`, `value`): `Promise`<`void`\>

#### Parameters

| Name | Type |
| :------ | :------ |
| `property` | `string` |
| `value` | `any` |

#### Returns

`Promise`<`void`\>

#### Defined in

[packages/echo/echo-db/src/parties/party-preferences.ts:37](https://github.com/dxos/dxos/blob/main/packages/echo/echo-db/src/parties/party-preferences.ts#L37)

___

### setGlobalPreference

**setGlobalPreference**(`property`, `value`): `Promise`<`void`\>

#### Parameters

| Name | Type |
| :------ | :------ |
| `property` | `string` |
| `value` | `any` |

#### Returns

`Promise`<`void`\>

#### Defined in

[packages/echo/echo-db/src/parties/party-preferences.ts:33](https://github.com/dxos/dxos/blob/main/packages/echo/echo-db/src/parties/party-preferences.ts#L33)

___

### setLastKnownTitle

**setLastKnownTitle**(`title`): `Promise`<`void`\>

#### Parameters

| Name | Type |
| :------ | :------ |
| `title` | `string` |

#### Returns

`Promise`<`void`\>

#### Defined in

[packages/echo/echo-db/src/parties/party-preferences.ts:78](https://github.com/dxos/dxos/blob/main/packages/echo/echo-db/src/parties/party-preferences.ts#L78)
