# Class: KeyStore

[@dxos/credentials](../modules/dxos_credentials.md).KeyStore

LevelDB key storage.

## Constructors

### constructor

**new KeyStore**(`db?`)

Takes the underlying to DB to use (eg, a leveldown, memdown, etc. instance).
If none is specified, memdown is used.

#### Parameters

| Name | Type |
| :------ | :------ |
| `db` | `any` |

#### Defined in

[packages/halo/credentials/src/keys/keystore.ts:33](https://github.com/dxos/dxos/blob/main/packages/halo/credentials/src/keys/keystore.ts#L33)

## Properties

### \_db

 `Private` `Readonly` **\_db**: `LevelUp`<`AbstractLevelDOWN`<`any`, `any`\>, `AbstractIterator`<`any`, `any`\>\>

#### Defined in

[packages/halo/credentials/src/keys/keystore.ts:27](https://github.com/dxos/dxos/blob/main/packages/halo/credentials/src/keys/keystore.ts#L27)

## Methods

### deleteRecord

**deleteRecord**(`key`): `Promise`<`void`\>

Deletes a KeyRecord from the KeyStore, indexed by `key`.

#### Parameters

| Name | Type |
| :------ | :------ |
| `key` | `string` |

#### Returns

`Promise`<`void`\>

#### Defined in

[packages/halo/credentials/src/keys/keystore.ts:50](https://github.com/dxos/dxos/blob/main/packages/halo/credentials/src/keys/keystore.ts#L50)

___

### getKeys

**getKeys**(): `Promise`<`string`[]\>

Returns all lookup key strings.

#### Returns

`Promise`<`string`[]\>

#### Defined in

[packages/halo/credentials/src/keys/keystore.ts:68](https://github.com/dxos/dxos/blob/main/packages/halo/credentials/src/keys/keystore.ts#L68)

___

### getRecord

**getRecord**(`key`): `Promise`<`KeyRecord`\>

Looks up a KeyRecord by `key`.

#### Parameters

| Name | Type |
| :------ | :------ |
| `key` | `string` |

#### Returns

`Promise`<`KeyRecord`\>

#### Defined in

[packages/halo/credentials/src/keys/keystore.ts:59](https://github.com/dxos/dxos/blob/main/packages/halo/credentials/src/keys/keystore.ts#L59)

___

### getRecords

**getRecords**(): `Promise`<`KeyRecord`[]\>

Returns all KeyRecord values.

#### Returns

`Promise`<`KeyRecord`[]\>

#### Defined in

[packages/halo/credentials/src/keys/keystore.ts:75](https://github.com/dxos/dxos/blob/main/packages/halo/credentials/src/keys/keystore.ts#L75)

___

### getRecordsWithKey

**getRecordsWithKey**(): `Promise`<[`string`, `KeyRecord`][]\>

Returns all entries as key/value pairs.

#### Returns

`Promise`<[`string`, `KeyRecord`][]\>

#### Defined in

[packages/halo/credentials/src/keys/keystore.ts:83](https://github.com/dxos/dxos/blob/main/packages/halo/credentials/src/keys/keystore.ts#L83)

___

### setRecord

**setRecord**(`key`, `record`): `Promise`<`void`\>

Adds a KeyRecord to the KeyStore, indexed by `key`.

#### Parameters

| Name | Type |
| :------ | :------ |
| `key` | `string` |
| `record` | `KeyRecord` |

#### Returns

`Promise`<`void`\>

#### Defined in

[packages/halo/credentials/src/keys/keystore.ts:40](https://github.com/dxos/dxos/blob/main/packages/halo/credentials/src/keys/keystore.ts#L40)
