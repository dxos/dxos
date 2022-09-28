# Interface: RegistryClientBackend

[@dxos/registry-client](../modules/dxos_registry_client.md).RegistryClientBackend

Minimal API for DXNS registry client backend.

## Implemented by

- [`MemoryRegistryClientBackend`](../classes/dxos_registry_client.MemoryRegistryClientBackend.md)
- [`PolkadotRegistry`](../classes/dxos_registry_client.PolkadotRegistry.md)

## Methods

### getDomainKey

**getDomainKey**(`domain`): `Promise`<[`DomainKey`](../classes/dxos_registry_client.DomainKey.md)\>

#### Parameters

| Name | Type |
| :------ | :------ |
| `domain` | `string` |

#### Returns

`Promise`<[`DomainKey`](../classes/dxos_registry_client.DomainKey.md)\>

#### Defined in

[packages/sdk/registry-client/src/api/registry.ts:28](https://github.com/dxos/dxos/blob/main/packages/sdk/registry-client/src/api/registry.ts#L28)

___

### getRecord

**getRecord**(`cid`): `Promise`<`undefined` \| [`RecordWithCid`](../types/dxos_registry_client.RecordWithCid.md)\>

#### Parameters

| Name | Type |
| :------ | :------ |
| `cid` | [`CID`](../classes/dxos_registry_client.CID.md) |

#### Returns

`Promise`<`undefined` \| [`RecordWithCid`](../types/dxos_registry_client.RecordWithCid.md)\>

#### Defined in

[packages/sdk/registry-client/src/api/registry.ts:38](https://github.com/dxos/dxos/blob/main/packages/sdk/registry-client/src/api/registry.ts#L38)

___

### getResource

**getResource**(`name`): `Promise`<`undefined` \| [`CID`](../classes/dxos_registry_client.CID.md)\>

#### Parameters

| Name | Type |
| :------ | :------ |
| `name` | [`DXN`](../classes/dxos_registry_client.DXN.md) |

#### Returns

`Promise`<`undefined` \| [`CID`](../classes/dxos_registry_client.CID.md)\>

#### Defined in

[packages/sdk/registry-client/src/api/registry.ts:31](https://github.com/dxos/dxos/blob/main/packages/sdk/registry-client/src/api/registry.ts#L31)

___

### listAuthorities

**listAuthorities**(): `Promise`<[`Authority`](../types/dxos_registry_client.Authority.md)[]\>

#### Returns

`Promise`<[`Authority`](../types/dxos_registry_client.Authority.md)[]\>

#### Defined in

[packages/sdk/registry-client/src/api/registry.ts:29](https://github.com/dxos/dxos/blob/main/packages/sdk/registry-client/src/api/registry.ts#L29)

___

### listRecords

**listRecords**(): `Promise`<[`RecordWithCid`](../types/dxos_registry_client.RecordWithCid.md)[]\>

#### Returns

`Promise`<[`RecordWithCid`](../types/dxos_registry_client.RecordWithCid.md)[]\>

#### Defined in

[packages/sdk/registry-client/src/api/registry.ts:39](https://github.com/dxos/dxos/blob/main/packages/sdk/registry-client/src/api/registry.ts#L39)

___

### listResources

**listResources**(): `Promise`<[[`DXN`](../classes/dxos_registry_client.DXN.md), [`CID`](../classes/dxos_registry_client.CID.md)][]\>

#### Returns

`Promise`<[[`DXN`](../classes/dxos_registry_client.DXN.md), [`CID`](../classes/dxos_registry_client.CID.md)][]\>

#### Defined in

[packages/sdk/registry-client/src/api/registry.ts:32](https://github.com/dxos/dxos/blob/main/packages/sdk/registry-client/src/api/registry.ts#L32)

___

### registerAuthority

**registerAuthority**(`owner`): `Promise`<[`DomainKey`](../classes/dxos_registry_client.DomainKey.md)\>

#### Parameters

| Name | Type |
| :------ | :------ |
| `owner` | [`AccountKey`](../classes/dxos_registry_client.AccountKey.md) |

#### Returns

`Promise`<[`DomainKey`](../classes/dxos_registry_client.DomainKey.md)\>

#### Defined in

[packages/sdk/registry-client/src/api/registry.ts:30](https://github.com/dxos/dxos/blob/main/packages/sdk/registry-client/src/api/registry.ts#L30)

___

### registerRecord

**registerRecord**(`record`): `Promise`<[`CID`](../classes/dxos_registry_client.CID.md)\>

#### Parameters

| Name | Type |
| :------ | :------ |
| `record` | `Record` |

#### Returns

`Promise`<[`CID`](../classes/dxos_registry_client.CID.md)\>

#### Defined in

[packages/sdk/registry-client/src/api/registry.ts:40](https://github.com/dxos/dxos/blob/main/packages/sdk/registry-client/src/api/registry.ts#L40)

___

### registerResource

**registerResource**(`name`, `cid`, `owner`): `Promise`<`void`\>

#### Parameters

| Name | Type |
| :------ | :------ |
| `name` | [`DXN`](../classes/dxos_registry_client.DXN.md) |
| `cid` | `undefined` \| [`CID`](../classes/dxos_registry_client.CID.md) |
| `owner` | [`AccountKey`](../classes/dxos_registry_client.AccountKey.md) |

#### Returns

`Promise`<`void`\>

#### Defined in

[packages/sdk/registry-client/src/api/registry.ts:33](https://github.com/dxos/dxos/blob/main/packages/sdk/registry-client/src/api/registry.ts#L33)
