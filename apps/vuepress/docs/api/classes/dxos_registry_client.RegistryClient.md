# Class: RegistryClient

[@dxos/registry-client](../modules/dxos_registry_client.md).RegistryClient

Main API for DXNS registry.

## Table of contents

### Constructors

- [constructor](dxos_registry_client.RegistryClient.md#constructor)

### Properties

- [\_recordCache](dxos_registry_client.RegistryClient.md#_recordcache)
- [\_typeCache](dxos_registry_client.RegistryClient.md#_typecache)

### Methods

- [\_decodeRecord](dxos_registry_client.RegistryClient.md#_decoderecord)
- [\_decodeType](dxos_registry_client.RegistryClient.md#_decodetype)
- [\_fetchRecord](dxos_registry_client.RegistryClient.md#_fetchrecord)
- [\_fetchType](dxos_registry_client.RegistryClient.md#_fetchtype)
- [getDomainKey](dxos_registry_client.RegistryClient.md#getdomainkey)
- [getRecord](dxos_registry_client.RegistryClient.md#getrecord)
- [getRecordByName](dxos_registry_client.RegistryClient.md#getrecordbyname)
- [getResource](dxos_registry_client.RegistryClient.md#getresource)
- [getTypeRecord](dxos_registry_client.RegistryClient.md#gettyperecord)
- [listAuthorities](dxos_registry_client.RegistryClient.md#listauthorities)
- [listRecords](dxos_registry_client.RegistryClient.md#listrecords)
- [listResources](dxos_registry_client.RegistryClient.md#listresources)
- [listTypeRecords](dxos_registry_client.RegistryClient.md#listtyperecords)
- [registerAuthority](dxos_registry_client.RegistryClient.md#registerauthority)
- [registerRecord](dxos_registry_client.RegistryClient.md#registerrecord)
- [registerResource](dxos_registry_client.RegistryClient.md#registerresource)
- [registerTypeRecord](dxos_registry_client.RegistryClient.md#registertyperecord)

## Constructors

### constructor

• **new RegistryClient**(`_backend`)

#### Parameters

| Name | Type |
| :------ | :------ |
| `_backend` | [`RegistryClientBackend`](../interfaces/dxos_registry_client.RegistryClientBackend.md) |

#### Defined in

[packages/sdk/registry-client/src/api/registry-client.ts:72](https://github.com/dxos/dxos/blob/e3b936721/packages/sdk/registry-client/src/api/registry-client.ts#L72)

## Properties

### \_recordCache

• `Private` `Readonly` **\_recordCache**: `ComplexMap`<[`CID`](dxos_registry_client.CID.md), `Promise`<`undefined` \| [`RegistryRecord`](../modules/dxos_registry_client.md#registryrecord)<`any`\>\>\>

#### Defined in

[packages/sdk/registry-client/src/api/registry-client.ts:69](https://github.com/dxos/dxos/blob/e3b936721/packages/sdk/registry-client/src/api/registry-client.ts#L69)

___

### \_typeCache

• `Private` `Readonly` **\_typeCache**: `ComplexMap`<[`CID`](dxos_registry_client.CID.md), `Promise`<`undefined` \| [`RegistryType`](../modules/dxos_registry_client.md#registrytype)\>\>

#### Defined in

[packages/sdk/registry-client/src/api/registry-client.ts:70](https://github.com/dxos/dxos/blob/e3b936721/packages/sdk/registry-client/src/api/registry-client.ts#L70)

## Methods

### \_decodeRecord

▸ `Private` **_decodeRecord**(`cid`, `rawRecord`): `Promise`<`undefined` \| [`RegistryRecord`](../modules/dxos_registry_client.md#registryrecord)<`any`\>\>

#### Parameters

| Name | Type |
| :------ | :------ |
| `cid` | [`CID`](dxos_registry_client.CID.md) |
| `rawRecord` | `Record` |

#### Returns

`Promise`<`undefined` \| [`RegistryRecord`](../modules/dxos_registry_client.md#registryrecord)<`any`\>\>

#### Defined in

[packages/sdk/registry-client/src/api/registry-client.ts:286](https://github.com/dxos/dxos/blob/e3b936721/packages/sdk/registry-client/src/api/registry-client.ts#L286)

___

### \_decodeType

▸ `Private` **_decodeType**(`cid`, `rawRecord`): [`RegistryType`](../modules/dxos_registry_client.md#registrytype)

#### Parameters

| Name | Type |
| :------ | :------ |
| `cid` | [`CID`](dxos_registry_client.CID.md) |
| `rawRecord` | `Record` |

#### Returns

[`RegistryType`](../modules/dxos_registry_client.md#registrytype)

#### Defined in

[packages/sdk/registry-client/src/api/registry-client.ts:311](https://github.com/dxos/dxos/blob/e3b936721/packages/sdk/registry-client/src/api/registry-client.ts#L311)

___

### \_fetchRecord

▸ `Private` **_fetchRecord**(`cid`): `Promise`<`undefined` \| [`RegistryRecord`](../modules/dxos_registry_client.md#registryrecord)<`any`\>\>

#### Parameters

| Name | Type |
| :------ | :------ |
| `cid` | [`CID`](dxos_registry_client.CID.md) |

#### Returns

`Promise`<`undefined` \| [`RegistryRecord`](../modules/dxos_registry_client.md#registryrecord)<`any`\>\>

#### Defined in

[packages/sdk/registry-client/src/api/registry-client.ts:280](https://github.com/dxos/dxos/blob/e3b936721/packages/sdk/registry-client/src/api/registry-client.ts#L280)

___

### \_fetchType

▸ `Private` **_fetchType**(`cid`): `Promise`<`undefined` \| [`RegistryType`](../modules/dxos_registry_client.md#registrytype)\>

#### Parameters

| Name | Type |
| :------ | :------ |
| `cid` | [`CID`](dxos_registry_client.CID.md) |

#### Returns

`Promise`<`undefined` \| [`RegistryType`](../modules/dxos_registry_client.md#registrytype)\>

#### Defined in

[packages/sdk/registry-client/src/api/registry-client.ts:302](https://github.com/dxos/dxos/blob/e3b936721/packages/sdk/registry-client/src/api/registry-client.ts#L302)

___

### getDomainKey

▸ **getDomainKey**(`domainName`): `Promise`<[`DomainKey`](dxos_registry_client.DomainKey.md)\>

Resolves a domain key from the domain name.

#### Parameters

| Name | Type | Description |
| :------ | :------ | :------ |
| `domainName` | `string` | Name of the domain. |

#### Returns

`Promise`<[`DomainKey`](dxos_registry_client.DomainKey.md)\>

#### Defined in

[packages/sdk/registry-client/src/api/registry-client.ts:84](https://github.com/dxos/dxos/blob/e3b936721/packages/sdk/registry-client/src/api/registry-client.ts#L84)

___

### getRecord

▸ **getRecord**<`T`\>(`cid`): `Promise`<`undefined` \| [`RegistryRecord`](../modules/dxos_registry_client.md#registryrecord)<`T`\>\>

Gets record details by CID.

#### Type parameters

| Name |
| :------ |
| `T` |

#### Parameters

| Name | Type | Description |
| :------ | :------ | :------ |
| `cid` | [`CID`](dxos_registry_client.CID.md) | CID of the record. |

#### Returns

`Promise`<`undefined` \| [`RegistryRecord`](../modules/dxos_registry_client.md#registryrecord)<`T`\>\>

#### Defined in

[packages/sdk/registry-client/src/api/registry-client.ts:168](https://github.com/dxos/dxos/blob/e3b936721/packages/sdk/registry-client/src/api/registry-client.ts#L168)

___

### getRecordByName

▸ **getRecordByName**<`T`\>(`name`): `Promise`<`undefined` \| [`RegistryRecord`](../modules/dxos_registry_client.md#registryrecord)<`T`\>\>

Gets resource by its registered name.

#### Type parameters

| Name |
| :------ |
| `T` |

#### Parameters

| Name | Type | Description |
| :------ | :------ | :------ |
| `name` | [`DXN`](dxos_registry_client.DXN.md) | DXN of the resource used for registration. |

#### Returns

`Promise`<`undefined` \| [`RegistryRecord`](../modules/dxos_registry_client.md#registryrecord)<`T`\>\>

#### Defined in

[packages/sdk/registry-client/src/api/registry-client.ts:183](https://github.com/dxos/dxos/blob/e3b936721/packages/sdk/registry-client/src/api/registry-client.ts#L183)

___

### getResource

▸ **getResource**(`name`): `Promise`<`undefined` \| [`CID`](dxos_registry_client.CID.md)\>

Gets resource by its registered name.

#### Parameters

| Name | Type | Description |
| :------ | :------ | :------ |
| `name` | [`DXN`](dxos_registry_client.DXN.md) | DXN of the resource used for registration. |

#### Returns

`Promise`<`undefined` \| [`CID`](dxos_registry_client.CID.md)\>

#### Defined in

[packages/sdk/registry-client/src/api/registry-client.ts:111](https://github.com/dxos/dxos/blob/e3b936721/packages/sdk/registry-client/src/api/registry-client.ts#L111)

___

### getTypeRecord

▸ **getTypeRecord**(`cid`): `Promise`<`undefined` \| [`RegistryType`](../modules/dxos_registry_client.md#registrytype)\>

Gets type records details by CID.

#### Parameters

| Name | Type | Description |
| :------ | :------ | :------ |
| `cid` | [`CID`](dxos_registry_client.CID.md) | CID of the record. |

#### Returns

`Promise`<`undefined` \| [`RegistryType`](../modules/dxos_registry_client.md#registrytype)\>

#### Defined in

[packages/sdk/registry-client/src/api/registry-client.ts:232](https://github.com/dxos/dxos/blob/e3b936721/packages/sdk/registry-client/src/api/registry-client.ts#L232)

___

### listAuthorities

▸ **listAuthorities**(): `Promise`<[`Authority`](../modules/dxos_registry_client.md#authority)[]\>

Returns a list of authorities created in DXOS system.

#### Returns

`Promise`<[`Authority`](../modules/dxos_registry_client.md#authority)[]\>

#### Defined in

[packages/sdk/registry-client/src/api/registry-client.ts:91](https://github.com/dxos/dxos/blob/e3b936721/packages/sdk/registry-client/src/api/registry-client.ts#L91)

___

### listRecords

▸ **listRecords**(`filter?`): `Promise`<[`RegistryRecord`](../modules/dxos_registry_client.md#registryrecord)<`any`\>[]\>

Lists records in the system.

#### Parameters

| Name | Type | Description |
| :------ | :------ | :------ |
| `filter?` | [`Filter`](../interfaces/dxos_registry_client.Filter.md) | Filter that each returned record must meet. |

#### Returns

`Promise`<[`RegistryRecord`](../modules/dxos_registry_client.md#registryrecord)<`any`\>[]\>

#### Defined in

[packages/sdk/registry-client/src/api/registry-client.ts:197](https://github.com/dxos/dxos/blob/e3b936721/packages/sdk/registry-client/src/api/registry-client.ts#L197)

___

### listResources

▸ **listResources**(`filter?`): `Promise`<[`ResourceSet`](../modules/dxos_registry_client.md#resourceset)[]\>

List resources registered in the system.

#### Parameters

| Name | Type | Description |
| :------ | :------ | :------ |
| `filter?` | [`Filter`](../interfaces/dxos_registry_client.Filter.md) | Filter that each returned record must meet. |

#### Returns

`Promise`<[`ResourceSet`](../modules/dxos_registry_client.md#resourceset)[]\>

#### Defined in

[packages/sdk/registry-client/src/api/registry-client.ts:120](https://github.com/dxos/dxos/blob/e3b936721/packages/sdk/registry-client/src/api/registry-client.ts#L120)

___

### listTypeRecords

▸ **listTypeRecords**(`filter?`): `Promise`<[`RegistryType`](../modules/dxos_registry_client.md#registrytype)[]\>

Lists type records in the system.

#### Parameters

| Name | Type | Description |
| :------ | :------ | :------ |
| `filter?` | [`Filter`](../interfaces/dxos_registry_client.Filter.md) | Filter that each returned record must meet. |

#### Returns

`Promise`<[`RegistryType`](../modules/dxos_registry_client.md#registrytype)[]\>

#### Defined in

[packages/sdk/registry-client/src/api/registry-client.ts:247](https://github.com/dxos/dxos/blob/e3b936721/packages/sdk/registry-client/src/api/registry-client.ts#L247)

___

### registerAuthority

▸ **registerAuthority**(`account`): `Promise`<[`DomainKey`](dxos_registry_client.DomainKey.md)\>

Creates a new domain in the system under a generated name.

#### Parameters

| Name | Type | Description |
| :------ | :------ | :------ |
| `account` | [`AccountKey`](dxos_registry_client.AccountKey.md) | DXNS account that will own the domain. |

#### Returns

`Promise`<[`DomainKey`](dxos_registry_client.DomainKey.md)\>

#### Defined in

[packages/sdk/registry-client/src/api/registry-client.ts:99](https://github.com/dxos/dxos/blob/e3b936721/packages/sdk/registry-client/src/api/registry-client.ts#L99)

___

### registerRecord

▸ **registerRecord**(`data`, `typeId`, `meta?`): `Promise`<[`CID`](dxos_registry_client.CID.md)\>

Creates a new data record in the system.

#### Parameters

| Name | Type | Description |
| :------ | :------ | :------ |
| `data` | `unknown` | Payload data of the record. |
| `typeId` | [`CID`](dxos_registry_client.CID.md) | CID of the type record that holds the schema of the data. |
| `meta` | [`RecordMetadata`](../interfaces/dxos_registry_client.RecordMetadata.md) | Record metadata information. |

#### Returns

`Promise`<[`CID`](dxos_registry_client.CID.md)\>

#### Defined in

[packages/sdk/registry-client/src/api/registry-client.ts:214](https://github.com/dxos/dxos/blob/e3b936721/packages/sdk/registry-client/src/api/registry-client.ts#L214)

___

### registerResource

▸ **registerResource**(`name`, `cid`, `owner`): `Promise`<`void`\>

Registers or updates a resource in the system.
Undefined CID means that the resource will be deleted.

#### Parameters

| Name | Type | Description |
| :------ | :------ | :------ |
| `name` | [`DXN`](dxos_registry_client.DXN.md) | Identifies the domain and name of the resource. |
| `cid` | `undefined` \| [`CID`](dxos_registry_client.CID.md) | CID of the record to be referenced with the given name. |
| `owner` | [`AccountKey`](dxos_registry_client.AccountKey.md) | DXNS account that will own the resource. |

#### Returns

`Promise`<`void`\>

#### Defined in

[packages/sdk/registry-client/src/api/registry-client.ts:152](https://github.com/dxos/dxos/blob/e3b936721/packages/sdk/registry-client/src/api/registry-client.ts#L152)

___

### registerTypeRecord

▸ **registerTypeRecord**(`messageName`, `schema`, `meta?`): `Promise`<[`CID`](dxos_registry_client.CID.md)\>

Creates a new type record in the system.

#### Parameters

| Name | Type | Description |
| :------ | :------ | :------ |
| `messageName` | `string` | - |
| `schema` | `Root` | Protobuf schema of the type. |
| `meta` | [`TypeRecordMetadata`](../interfaces/dxos_registry_client.TypeRecordMetadata.md) | Record metadata information. |

#### Returns

`Promise`<[`CID`](dxos_registry_client.CID.md)\>

#### Defined in

[packages/sdk/registry-client/src/api/registry-client.ts:263](https://github.com/dxos/dxos/blob/e3b936721/packages/sdk/registry-client/src/api/registry-client.ts#L263)
