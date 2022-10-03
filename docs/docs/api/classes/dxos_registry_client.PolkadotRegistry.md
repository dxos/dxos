# Class: PolkadotRegistry

[@dxos/registry-client](../modules/dxos_registry_client.md).PolkadotRegistry

Polkadot DXNS registry client backend.

## Hierarchy

- [`PolkadotClient`](dxos_registry_client.PolkadotClient.md)

  ↳ **`PolkadotRegistry`**

## Implements

- [`RegistryClientBackend`](../interfaces/dxos_registry_client.RegistryClientBackend.md)

## Constructors

### constructor

**new PolkadotRegistry**(`api`, `signFn?`)

#### Parameters

| Name | Type |
| :------ | :------ |
| `api` | `ApiPromise` |
| `signFn` | [`SignTxFunction`](../types/dxos_registry_client.SignTxFunction.md) \| `AddressOrPair` |

#### Inherited from

[PolkadotClient](dxos_registry_client.PolkadotClient.md).[constructor](dxos_registry_client.PolkadotClient.md#constructor)

#### Defined in

[packages/sdk/registry-client/src/polkadot/polkadot-client.ts:16](https://github.com/dxos/dxos/blob/main/packages/sdk/registry-client/src/polkadot/polkadot-client.ts#L16)

## Properties

### api

 `Protected` **api**: `ApiPromise`

#### Inherited from

[PolkadotClient](dxos_registry_client.PolkadotClient.md).[api](dxos_registry_client.PolkadotClient.md#api)

#### Defined in

[packages/sdk/registry-client/src/polkadot/polkadot-client.ts:17](https://github.com/dxos/dxos/blob/main/packages/sdk/registry-client/src/polkadot/polkadot-client.ts#L17)

___

### transactionsHandler

 `Protected` **transactionsHandler**: [`ApiTransactionHandler`](dxos_registry_client.ApiTransactionHandler.md)

#### Inherited from

[PolkadotClient](dxos_registry_client.PolkadotClient.md).[transactionsHandler](dxos_registry_client.PolkadotClient.md#transactionshandler)

#### Defined in

[packages/sdk/registry-client/src/polkadot/polkadot-client.ts:14](https://github.com/dxos/dxos/blob/main/packages/sdk/registry-client/src/polkadot/polkadot-client.ts#L14)

## Methods

### \_decodeRecord

`Private` **_decodeRecord**(`record`): `Record`

#### Parameters

| Name | Type |
| :------ | :------ |
| `record` | `Record` |

#### Returns

`Record`

#### Defined in

[packages/sdk/registry-client/src/polkadot/registry.ts:200](https://github.com/dxos/dxos/blob/main/packages/sdk/registry-client/src/polkadot/registry.ts#L200)

___

### \_decodeResource

`Private` **_decodeResource**(`resource`): `Record`<`string`, [`CID`](dxos_registry_client.CID.md)\>

#### Parameters

| Name | Type |
| :------ | :------ |
| `resource` | `Resource` |

#### Returns

`Record`<`string`, [`CID`](dxos_registry_client.CID.md)\>

#### Defined in

[packages/sdk/registry-client/src/polkadot/registry.ts:139](https://github.com/dxos/dxos/blob/main/packages/sdk/registry-client/src/polkadot/registry.ts#L139)

___

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

[packages/sdk/registry-client/src/polkadot/registry.ts:34](https://github.com/dxos/dxos/blob/main/packages/sdk/registry-client/src/polkadot/registry.ts#L34)

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

[packages/sdk/registry-client/src/polkadot/registry.ts:152](https://github.com/dxos/dxos/blob/main/packages/sdk/registry-client/src/polkadot/registry.ts#L152)

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

[packages/sdk/registry-client/src/polkadot/registry.ts:67](https://github.com/dxos/dxos/blob/main/packages/sdk/registry-client/src/polkadot/registry.ts#L67)

___

### listAuthorities

**listAuthorities**(): `Promise`<[`Authority`](../types/dxos_registry_client.Authority.md)[]\>

#### Returns

`Promise`<[`Authority`](../types/dxos_registry_client.Authority.md)[]\>

#### Implementation of

[RegistryClientBackend](../interfaces/dxos_registry_client.RegistryClientBackend.md).[listAuthorities](../interfaces/dxos_registry_client.RegistryClientBackend.md#listauthorities)

#### Defined in

[packages/sdk/registry-client/src/polkadot/registry.ts:40](https://github.com/dxos/dxos/blob/main/packages/sdk/registry-client/src/polkadot/registry.ts#L40)

___

### listRecords

**listRecords**(): `Promise`<[`RecordWithCid`](../types/dxos_registry_client.RecordWithCid.md)[]\>

#### Returns

`Promise`<[`RecordWithCid`](../types/dxos_registry_client.RecordWithCid.md)[]\>

#### Implementation of

[RegistryClientBackend](../interfaces/dxos_registry_client.RegistryClientBackend.md).[listRecords](../interfaces/dxos_registry_client.RegistryClientBackend.md#listrecords)

#### Defined in

[packages/sdk/registry-client/src/polkadot/registry.ts:161](https://github.com/dxos/dxos/blob/main/packages/sdk/registry-client/src/polkadot/registry.ts#L161)

___

### listResources

**listResources**(): `Promise`<[[`DXN`](dxos_registry_client.DXN.md), [`CID`](dxos_registry_client.CID.md)][]\>

#### Returns

`Promise`<[[`DXN`](dxos_registry_client.DXN.md), [`CID`](dxos_registry_client.CID.md)][]\>

#### Implementation of

[RegistryClientBackend](../interfaces/dxos_registry_client.RegistryClientBackend.md).[listResources](../interfaces/dxos_registry_client.RegistryClientBackend.md#listresources)

#### Defined in

[packages/sdk/registry-client/src/polkadot/registry.ts:84](https://github.com/dxos/dxos/blob/main/packages/sdk/registry-client/src/polkadot/registry.ts#L84)

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

[packages/sdk/registry-client/src/polkadot/registry.ts:56](https://github.com/dxos/dxos/blob/main/packages/sdk/registry-client/src/polkadot/registry.ts#L56)

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

[packages/sdk/registry-client/src/polkadot/registry.ts:180](https://github.com/dxos/dxos/blob/main/packages/sdk/registry-client/src/polkadot/registry.ts#L180)

___

### registerRecordBytes

**registerRecordBytes**(`data`): `Promise`<[`CID`](dxos_registry_client.CID.md)\>

#### Parameters

| Name | Type |
| :------ | :------ |
| `data` | `Uint8Array` |

#### Returns

`Promise`<[`CID`](dxos_registry_client.CID.md)\>

#### Defined in

[packages/sdk/registry-client/src/polkadot/registry.ts:189](https://github.com/dxos/dxos/blob/main/packages/sdk/registry-client/src/polkadot/registry.ts#L189)

___

### registerResource

**registerResource**(`name`, `cid`, `owner`): `Promise`<`void`\>

#### Parameters

| Name | Type |
| :------ | :------ |
| `name` | [`DXN`](dxos_registry_client.DXN.md) |
| `cid` | [`CID`](dxos_registry_client.CID.md) |
| `owner` | [`AccountKey`](dxos_registry_client.AccountKey.md) |

#### Returns

`Promise`<`void`\>

#### Implementation of

[RegistryClientBackend](../interfaces/dxos_registry_client.RegistryClientBackend.md).[registerResource](../interfaces/dxos_registry_client.RegistryClientBackend.md#registerresource)

#### Defined in

[packages/sdk/registry-client/src/polkadot/registry.ts:108](https://github.com/dxos/dxos/blob/main/packages/sdk/registry-client/src/polkadot/registry.ts#L108)
