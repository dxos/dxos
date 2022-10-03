# Class: MemoryRegistryClientBackend

[@dxos/registry-client](../modules/dxos_registry_client.md).MemoryRegistryClientBackend

In-memory implementation of the registry client with statically specified records.
Useful for testing code which relies on the DXNS registry without connecting to a real node.

## Implements

- [`RegistryClientBackend`](../interfaces/dxos_registry_client.RegistryClientBackend.md)

## Constructors

### constructor

**new MemoryRegistryClientBackend**()

## Properties

### authorities

 `Readonly` **authorities**: `Map`<`string`, [`Authority`](../types/dxos_registry_client.Authority.md)\>

#### Defined in

[packages/sdk/registry-client/src/testing/memory-registry-client.ts:29](https://github.com/dxos/dxos/blob/main/packages/sdk/registry-client/src/testing/memory-registry-client.ts#L29)

___

### records

 `Readonly` **records**: `ComplexMap`<[`CID`](dxos_registry_client.CID.md), `Record`\>

#### Defined in

[packages/sdk/registry-client/src/testing/memory-registry-client.ts:31](https://github.com/dxos/dxos/blob/main/packages/sdk/registry-client/src/testing/memory-registry-client.ts#L31)

___

### resources

 `Readonly` **resources**: `ComplexMap`<[`DXN`](dxos_registry_client.DXN.md), [`CID`](dxos_registry_client.CID.md)\>

#### Defined in

[packages/sdk/registry-client/src/testing/memory-registry-client.ts:30](https://github.com/dxos/dxos/blob/main/packages/sdk/registry-client/src/testing/memory-registry-client.ts#L30)

## Methods

### getDomainKey

**getDomainKey**(`domainName`): `Promise`<[`DomainKey`](dxos_registry_client.DomainKey.md)\>

#### Parameters

| Name | Type |
| :------ | :------ |
| `domainName` | `string` |

#### Returns

`Promise`<[`DomainKey`](dxos_registry_client.DomainKey.md)\>

#### Implementation of

[RegistryClientBackend](../interfaces/dxos_registry_client.RegistryClientBackend.md).[getDomainKey](../interfaces/dxos_registry_client.RegistryClientBackend.md#getdomainkey)

#### Defined in

[packages/sdk/registry-client/src/testing/memory-registry-client.ts:37](https://github.com/dxos/dxos/blob/main/packages/sdk/registry-client/src/testing/memory-registry-client.ts#L37)

___

### getRecord

**getRecord**(`cid`): `Promise`<`undefined` \| [`RecordWithCid`](../types/dxos_registry_client.RecordWithCid.md)\>

#### Parameters

| Name | Type |
| :------ | :------ |
| `cid` | [`CID`](dxos_registry_client.CID.md) |

#### Returns

`Promise`<`undefined` \| [`RecordWithCid`](../types/dxos_registry_client.RecordWithCid.md)\>

#### Implementation of

[RegistryClientBackend](../interfaces/dxos_registry_client.RegistryClientBackend.md).[getRecord](../interfaces/dxos_registry_client.RegistryClientBackend.md#getrecord)

#### Defined in

[packages/sdk/registry-client/src/testing/memory-registry-client.ts:107](https://github.com/dxos/dxos/blob/main/packages/sdk/registry-client/src/testing/memory-registry-client.ts#L107)

___

### getResource

**getResource**(`name`): `Promise`<`undefined` \| [`CID`](dxos_registry_client.CID.md)\>

#### Parameters

| Name | Type |
| :------ | :------ |
| `name` | [`DXN`](dxos_registry_client.DXN.md) |

#### Returns

`Promise`<`undefined` \| [`CID`](dxos_registry_client.CID.md)\>

#### Implementation of

[RegistryClientBackend](../interfaces/dxos_registry_client.RegistryClientBackend.md).[getResource](../interfaces/dxos_registry_client.RegistryClientBackend.md#getresource)

#### Defined in

[packages/sdk/registry-client/src/testing/memory-registry-client.ts:76](https://github.com/dxos/dxos/blob/main/packages/sdk/registry-client/src/testing/memory-registry-client.ts#L76)

___

### listAuthorities

**listAuthorities**(): `Promise`<[`Authority`](../types/dxos_registry_client.Authority.md)[]\>

#### Returns

`Promise`<[`Authority`](../types/dxos_registry_client.Authority.md)[]\>

#### Implementation of

[RegistryClientBackend](../interfaces/dxos_registry_client.RegistryClientBackend.md).[listAuthorities](../interfaces/dxos_registry_client.RegistryClientBackend.md#listauthorities)

#### Defined in

[packages/sdk/registry-client/src/testing/memory-registry-client.ts:46](https://github.com/dxos/dxos/blob/main/packages/sdk/registry-client/src/testing/memory-registry-client.ts#L46)

___

### listRecords

**listRecords**(): `Promise`<[`RecordWithCid`](../types/dxos_registry_client.RecordWithCid.md)[]\>

#### Returns

`Promise`<[`RecordWithCid`](../types/dxos_registry_client.RecordWithCid.md)[]\>

#### Implementation of

[RegistryClientBackend](../interfaces/dxos_registry_client.RegistryClientBackend.md).[listRecords](../interfaces/dxos_registry_client.RegistryClientBackend.md#listrecords)

#### Defined in

[packages/sdk/registry-client/src/testing/memory-registry-client.ts:111](https://github.com/dxos/dxos/blob/main/packages/sdk/registry-client/src/testing/memory-registry-client.ts#L111)

___

### listResources

**listResources**(): `Promise`<[[`DXN`](dxos_registry_client.DXN.md), [`CID`](dxos_registry_client.CID.md)][]\>

#### Returns

`Promise`<[[`DXN`](dxos_registry_client.DXN.md), [`CID`](dxos_registry_client.CID.md)][]\>

#### Implementation of

[RegistryClientBackend](../interfaces/dxos_registry_client.RegistryClientBackend.md).[listResources](../interfaces/dxos_registry_client.RegistryClientBackend.md#listresources)

#### Defined in

[packages/sdk/registry-client/src/testing/memory-registry-client.ts:80](https://github.com/dxos/dxos/blob/main/packages/sdk/registry-client/src/testing/memory-registry-client.ts#L80)

___

### registerAuthority

**registerAuthority**(`owner`): `Promise`<[`DomainKey`](dxos_registry_client.DomainKey.md)\>

#### Parameters

| Name | Type |
| :------ | :------ |
| `owner` | [`AccountKey`](dxos_registry_client.AccountKey.md) |

#### Returns

`Promise`<[`DomainKey`](dxos_registry_client.DomainKey.md)\>

#### Implementation of

[RegistryClientBackend](../interfaces/dxos_registry_client.RegistryClientBackend.md).[registerAuthority](../interfaces/dxos_registry_client.RegistryClientBackend.md#registerauthority)

#### Defined in

[packages/sdk/registry-client/src/testing/memory-registry-client.ts:50](https://github.com/dxos/dxos/blob/main/packages/sdk/registry-client/src/testing/memory-registry-client.ts#L50)

___

### registerDomainName

**registerDomainName**(`domainName`, `owner`): `Promise`<[`Authority`](../types/dxos_registry_client.Authority.md)\>

#### Parameters

| Name | Type |
| :------ | :------ |
| `domainName` | `string` |
| `owner` | [`AccountKey`](dxos_registry_client.AccountKey.md) |

#### Returns

`Promise`<[`Authority`](../types/dxos_registry_client.Authority.md)\>

#### Defined in

[packages/sdk/registry-client/src/testing/memory-registry-client.ts:60](https://github.com/dxos/dxos/blob/main/packages/sdk/registry-client/src/testing/memory-registry-client.ts#L60)

___

### registerRecord

**registerRecord**(`record`): `Promise`<[`CID`](dxos_registry_client.CID.md)\>

#### Parameters

| Name | Type |
| :------ | :------ |
| `record` | `Record` |

#### Returns

`Promise`<[`CID`](dxos_registry_client.CID.md)\>

#### Implementation of

[RegistryClientBackend](../interfaces/dxos_registry_client.RegistryClientBackend.md).[registerRecord](../interfaces/dxos_registry_client.RegistryClientBackend.md#registerrecord)

#### Defined in

[packages/sdk/registry-client/src/testing/memory-registry-client.ts:115](https://github.com/dxos/dxos/blob/main/packages/sdk/registry-client/src/testing/memory-registry-client.ts#L115)

___

### registerResource

**registerResource**(`name`, `cid`, `owner`): `Promise`<`void`\>

#### Parameters

| Name | Type |
| :------ | :------ |
| `name` | [`DXN`](dxos_registry_client.DXN.md) |
| `cid` | `undefined` \| [`CID`](dxos_registry_client.CID.md) |
| `owner` | [`AccountKey`](dxos_registry_client.AccountKey.md) |

#### Returns

`Promise`<`void`\>

#### Implementation of

[RegistryClientBackend](../interfaces/dxos_registry_client.RegistryClientBackend.md).[registerResource](../interfaces/dxos_registry_client.RegistryClientBackend.md#registerresource)

#### Defined in

[packages/sdk/registry-client/src/testing/memory-registry-client.ts:84](https://github.com/dxos/dxos/blob/main/packages/sdk/registry-client/src/testing/memory-registry-client.ts#L84)
