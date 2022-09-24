# Module: @dxos/registry-client

## Table of contents

### Namespaces

- [definitions](dxos_registry_client.definitions.md)

### Classes

- [AccountKey](../classes/dxos_registry_client.AccountKey.md)
- [AccountsClient](../classes/dxos_registry_client.AccountsClient.md)
- [ApiTransactionHandler](../classes/dxos_registry_client.ApiTransactionHandler.md)
- [AuctionsClient](../classes/dxos_registry_client.AuctionsClient.md)
- [CID](../classes/dxos_registry_client.CID.md)
- [ClientSigner](../classes/dxos_registry_client.ClientSigner.md)
- [ClientSignerAdapter](../classes/dxos_registry_client.ClientSignerAdapter.md)
- [DXN](../classes/dxos_registry_client.DXN.md)
- [DomainKey](../classes/dxos_registry_client.DomainKey.md)
- [MemoryRegistryClientBackend](../classes/dxos_registry_client.MemoryRegistryClientBackend.md)
- [PolkadotAccounts](../classes/dxos_registry_client.PolkadotAccounts.md)
- [PolkadotAuctions](../classes/dxos_registry_client.PolkadotAuctions.md)
- [PolkadotClient](../classes/dxos_registry_client.PolkadotClient.md)
- [PolkadotRegistry](../classes/dxos_registry_client.PolkadotRegistry.md)
- [RegistryClient](../classes/dxos_registry_client.RegistryClient.md)

### Interfaces

- [Account](../interfaces/dxos_registry_client.Account.md)
- [AccountsClientBackend](../interfaces/dxos_registry_client.AccountsClientBackend.md)
- [Auction](../interfaces/dxos_registry_client.Auction.md)
- [AuctionsClientBackend](../interfaces/dxos_registry_client.AuctionsClientBackend.md)
- [Filter](../interfaces/dxos_registry_client.Filter.md)
- [RecordMetadata](../interfaces/dxos_registry_client.RecordMetadata.md)
- [RegistryClientBackend](../interfaces/dxos_registry_client.RegistryClientBackend.md)
- [TypeRecordMetadata](../interfaces/dxos_registry_client.TypeRecordMetadata.md)

### Type Aliases

- [Authority](dxos_registry_client.md#authority)
- [CIDLike](dxos_registry_client.md#cidlike)
- [DXNString](dxos_registry_client.md#dxnstring)
- [RecordExtension](dxos_registry_client.md#recordextension)
- [RecordWithCid](dxos_registry_client.md#recordwithcid)
- [RegistryRecord](dxos_registry_client.md#registryrecord)
- [RegistryType](dxos_registry_client.md#registrytype)
- [ResourceSet](dxos_registry_client.md#resourceset)
- [SignTxFunction](dxos_registry_client.md#signtxfunction)

### Variables

- [ACCOUNT\_KEY\_LENGTH](dxos_registry_client.md#account_key_length)
- [DOMAIN\_KEY\_LENGTH](dxos_registry_client.md#domain_key_length)
- [Filtering](dxos_registry_client.md#filtering)
- [mockTypeMessageNames](dxos_registry_client.md#mocktypemessagenames)
- [registryTypes](dxos_registry_client.md#registrytypes)

### Functions

- [createApiPromise](dxos_registry_client.md#createapipromise)
- [createCID](dxos_registry_client.md#createcid)
- [createDXN](dxos_registry_client.md#createdxn)
- [createKeyring](dxos_registry_client.md#createkeyring)
- [createMockTypes](dxos_registry_client.md#createmocktypes)
- [decodeExtensionPayload](dxos_registry_client.md#decodeextensionpayload)
- [encodeExtensionPayload](dxos_registry_client.md#encodeextensionpayload)
- [getRandomTypeRecord](dxos_registry_client.md#getrandomtyperecord)
- [registerMockRecord](dxos_registry_client.md#registermockrecord)
- [registerMockResource](dxos_registry_client.md#registermockresource)
- [registerMockTypeRecord](dxos_registry_client.md#registermocktyperecord)
- [registerMockTypes](dxos_registry_client.md#registermocktypes)
- [sanitizeExtensionData](dxos_registry_client.md#sanitizeextensiondata)

## Type Aliases

### Authority

Ƭ **Authority**: `Object`

Authorities provide namespaces for records.
Domain names for authorities are auctioned.

#### Type declaration

| Name | Type |
| :------ | :------ |
| `domainName?` | `string` |
| `key` | [`DomainKey`](../classes/dxos_registry_client.DomainKey.md) |
| `owner` | `string` |

#### Defined in

[packages/sdk/registry-client/src/api/registry.ts:16](https://github.com/dxos/dxos/blob/32ae9b579/packages/sdk/registry-client/src/api/registry.ts#L16)

___

### CIDLike

Ƭ **CIDLike**: [`CID`](../classes/dxos_registry_client.CID.md) \| `Uint8Array` \| `Multihash` \| `string`

#### Defined in

[packages/sdk/registry-client/src/api/cid.ts:56](https://github.com/dxos/dxos/blob/32ae9b579/packages/sdk/registry-client/src/api/cid.ts#L56)

___

### DXNString

Ƭ **DXNString**: `string`

#### Defined in

[packages/sdk/registry-client/src/api/dxn.ts:7](https://github.com/dxos/dxos/blob/32ae9b579/packages/sdk/registry-client/src/api/dxn.ts#L7)

___

### RecordExtension

Ƭ **RecordExtension**<`T`\>: { `@type`: [`CID`](../classes/dxos_registry_client.CID.md)  } & `Pick`<`T`, `Exclude`<keyof `T`, ``"@type"``\>\>

#### Type parameters

| Name |
| :------ |
| `T` |

#### Defined in

[packages/sdk/registry-client/src/encoding/encoding.ts:17](https://github.com/dxos/dxos/blob/32ae9b579/packages/sdk/registry-client/src/encoding/encoding.ts#L17)

___

### RecordWithCid

Ƭ **RecordWithCid**: `RawRecord` & { `cid`: [`CID`](../classes/dxos_registry_client.CID.md)  }

#### Defined in

[packages/sdk/registry-client/src/api/registry.ts:22](https://github.com/dxos/dxos/blob/32ae9b579/packages/sdk/registry-client/src/api/registry.ts#L22)

___

### RegistryRecord

Ƭ **RegistryRecord**<`T`\>: `Omit`<`RawRecord`, ``"payload"`` \| ``"type"``\> & { `cid`: [`CID`](../classes/dxos_registry_client.CID.md) ; `payload`: [`RecordExtension`](dxos_registry_client.md#recordextension)<`T`\>  }

#### Type parameters

| Name | Type |
| :------ | :------ |
| `T` | `any` |

#### Defined in

[packages/sdk/registry-client/src/api/registry-client.ts:31](https://github.com/dxos/dxos/blob/32ae9b579/packages/sdk/registry-client/src/api/registry-client.ts#L31)

___

### RegistryType

Ƭ **RegistryType**: `Omit`<`RawRecord`, ``"payload"`` \| ``"type"``\> & { `cid`: [`CID`](../classes/dxos_registry_client.CID.md) ; `type`: { `messageName`: `string` ; `protobufDefs`: `protobuf.Root` ; `protobufIpfsCid?`: [`CID`](../classes/dxos_registry_client.CID.md)  }  }

#### Defined in

[packages/sdk/registry-client/src/api/registry-client.ts:36](https://github.com/dxos/dxos/blob/32ae9b579/packages/sdk/registry-client/src/api/registry-client.ts#L36)

___

### ResourceSet

Ƭ **ResourceSet**: `Object`

#### Type declaration

| Name | Type |
| :------ | :------ |
| `name` | [`DXN`](../classes/dxos_registry_client.DXN.md) |
| `tags` | `Record`<`string`, [`CID`](../classes/dxos_registry_client.CID.md)\> |

#### Defined in

[packages/sdk/registry-client/src/api/registry-client.ts:26](https://github.com/dxos/dxos/blob/32ae9b579/packages/sdk/registry-client/src/api/registry-client.ts#L26)

___

### SignTxFunction

Ƭ **SignTxFunction**: (`tx`: `Tx`) => `MaybePromise`<`Tx`\>

#### Type declaration

▸ (`tx`): `MaybePromise`<`Tx`\>

##### Parameters

| Name | Type |
| :------ | :------ |
| `tx` | `Tx` |

##### Returns

`MaybePromise`<`Tx`\>

#### Defined in

[packages/sdk/registry-client/src/polkadot/api-transaction-handler.ts:14](https://github.com/dxos/dxos/blob/32ae9b579/packages/sdk/registry-client/src/polkadot/api-transaction-handler.ts#L14)

## Variables

### ACCOUNT\_KEY\_LENGTH

• `Const` **ACCOUNT\_KEY\_LENGTH**: ``32``

#### Defined in

[packages/sdk/registry-client/src/api/account-key.ts:8](https://github.com/dxos/dxos/blob/32ae9b579/packages/sdk/registry-client/src/api/account-key.ts#L8)

___

### DOMAIN\_KEY\_LENGTH

• `Const` **DOMAIN\_KEY\_LENGTH**: ``32``

#### Defined in

[packages/sdk/registry-client/src/api/domain-key.ts:8](https://github.com/dxos/dxos/blob/32ae9b579/packages/sdk/registry-client/src/api/domain-key.ts#L8)

___

### Filtering

• `Const` **Filtering**: `Object`

Filtering logic in list methods of the API.

#### Type declaration

| Name | Type |
| :------ | :------ |
| `matchRecord` | (`record`: [`RegistryRecord`](dxos_registry_client.md#registryrecord)<`any`\>, `filter?`: [`Filter`](../interfaces/dxos_registry_client.Filter.md)) => `boolean` |
| `matchResource` | (`name`: [`DXN`](../classes/dxos_registry_client.DXN.md), `filter?`: [`Filter`](../interfaces/dxos_registry_client.Filter.md)) => `boolean` |

#### Defined in

[packages/sdk/registry-client/src/api/filtering.ts:27](https://github.com/dxos/dxos/blob/32ae9b579/packages/sdk/registry-client/src/api/filtering.ts#L27)

___

### mockTypeMessageNames

• `Const` **mockTypeMessageNames**: `string`[]

#### Defined in

[packages/sdk/registry-client/src/testing/fake-data-generator.ts:66](https://github.com/dxos/dxos/blob/32ae9b579/packages/sdk/registry-client/src/testing/fake-data-generator.ts#L66)

___

### registryTypes

• `Const` **registryTypes**: `RegistryTypes`

#### Defined in

[packages/sdk/registry-client/src/polkadot/api-creation.ts:14](https://github.com/dxos/dxos/blob/32ae9b579/packages/sdk/registry-client/src/polkadot/api-creation.ts#L14)

## Functions

### createApiPromise

▸ **createApiPromise**(`endpoint`): `Promise`<`ApiPromise`\>

Creates an API primitive that holds the connection, transaction and querying of substrate node.

#### Parameters

| Name | Type | Description |
| :------ | :------ | :------ |
| `endpoint` | `string` | URI of the substrate node. |

#### Returns

`Promise`<`ApiPromise`\>

#### Defined in

[packages/sdk/registry-client/src/polkadot/api-creation.ts:29](https://github.com/dxos/dxos/blob/32ae9b579/packages/sdk/registry-client/src/polkadot/api-creation.ts#L29)

___

### createCID

▸ **createCID**(): [`CID`](../classes/dxos_registry_client.CID.md)

Generates a random CID.

#### Returns

[`CID`](../classes/dxos_registry_client.CID.md)

#### Defined in

[packages/sdk/registry-client/src/testing/fake-data-generator.ts:17](https://github.com/dxos/dxos/blob/32ae9b579/packages/sdk/registry-client/src/testing/fake-data-generator.ts#L17)

___

### createDXN

▸ **createDXN**(`domain?`): [`DXN`](../classes/dxos_registry_client.DXN.md)

Generates a random DXN.
Accepts a custom domain, uses 'example' by default.

#### Parameters

| Name | Type | Default value |
| :------ | :------ | :------ |
| `domain` | `string` | `'example'` |

#### Returns

[`DXN`](../classes/dxos_registry_client.DXN.md)

#### Defined in

[packages/sdk/registry-client/src/testing/fake-data-generator.ts:23](https://github.com/dxos/dxos/blob/32ae9b579/packages/sdk/registry-client/src/testing/fake-data-generator.ts#L23)

___

### createKeyring

▸ **createKeyring**(`options?`): `Promise`<`Keyring`\>

#### Parameters

| Name | Type |
| :------ | :------ |
| `options?` | `KeyringOptions` |

#### Returns

`Promise`<`Keyring`\>

#### Defined in

[packages/sdk/registry-client/src/polkadot/api-creation.ts:18](https://github.com/dxos/dxos/blob/32ae9b579/packages/sdk/registry-client/src/polkadot/api-creation.ts#L18)

___

### createMockTypes

▸ **createMockTypes**(): [`RegistryType`](dxos_registry_client.md#registrytype)[]

#### Returns

[`RegistryType`](dxos_registry_client.md#registrytype)[]

#### Defined in

[packages/sdk/registry-client/src/testing/fake-data-generator.ts:100](https://github.com/dxos/dxos/blob/32ae9b579/packages/sdk/registry-client/src/testing/fake-data-generator.ts#L100)

___

### decodeExtensionPayload

▸ **decodeExtensionPayload**(`extension`, `resolveType`): `Promise`<[`RecordExtension`](dxos_registry_client.md#recordextension)<`any`\>\>

#### Parameters

| Name | Type |
| :------ | :------ |
| `extension` | `Extension` |
| `resolveType` | (`cid`: [`CID`](../classes/dxos_registry_client.CID.md)) => `Promise`<[`RegistryType`](dxos_registry_client.md#registrytype)\> |

#### Returns

`Promise`<[`RecordExtension`](dxos_registry_client.md#recordextension)<`any`\>\>

#### Defined in

[packages/sdk/registry-client/src/encoding/encoding.ts:30](https://github.com/dxos/dxos/blob/32ae9b579/packages/sdk/registry-client/src/encoding/encoding.ts#L30)

___

### encodeExtensionPayload

▸ **encodeExtensionPayload**(`data`, `resolveType`): `Promise`<`Extension`\>

#### Parameters

| Name | Type |
| :------ | :------ |
| `data` | [`RecordExtension`](dxos_registry_client.md#recordextension)<`any`\> |
| `resolveType` | (`cid`: [`CID`](../classes/dxos_registry_client.CID.md)) => `Promise`<[`RegistryType`](dxos_registry_client.md#registrytype)\> |

#### Returns

`Promise`<`Extension`\>

#### Defined in

[packages/sdk/registry-client/src/encoding/encoding.ts:56](https://github.com/dxos/dxos/blob/32ae9b579/packages/sdk/registry-client/src/encoding/encoding.ts#L56)

___

### getRandomTypeRecord

▸ **getRandomTypeRecord**(`registry`): `Promise`<[`RegistryType`](dxos_registry_client.md#registrytype)\>

#### Parameters

| Name | Type |
| :------ | :------ |
| `registry` | [`RegistryClient`](../classes/dxos_registry_client.RegistryClient.md) |

#### Returns

`Promise`<[`RegistryType`](dxos_registry_client.md#registrytype)\>

#### Defined in

[packages/sdk/registry-client/src/testing/fake-data-generator.ts:61](https://github.com/dxos/dxos/blob/32ae9b579/packages/sdk/registry-client/src/testing/fake-data-generator.ts#L61)

___

### registerMockRecord

▸ **registerMockRecord**(`registry`, `params`): `Promise`<[`CID`](../classes/dxos_registry_client.CID.md)\>

Generates a single random record.

#### Parameters

| Name | Type |
| :------ | :------ |
| `registry` | [`RegistryClient`](../classes/dxos_registry_client.RegistryClient.md) |
| `params` | `Object` |
| `params.data?` | `unknown` |
| `params.meta?` | [`RecordMetadata`](../interfaces/dxos_registry_client.RecordMetadata.md) |
| `params.typeRecord?` | [`CID`](../classes/dxos_registry_client.CID.md) |

#### Returns

`Promise`<[`CID`](../classes/dxos_registry_client.CID.md)\>

#### Defined in

[packages/sdk/registry-client/src/testing/fake-data-generator.ts:41](https://github.com/dxos/dxos/blob/32ae9b579/packages/sdk/registry-client/src/testing/fake-data-generator.ts#L41)

___

### registerMockResource

▸ **registerMockResource**(`registry`, `params?`): `Promise`<`void`\>

Generates a single resource, optionally generating a random name and type if none are provided.

#### Parameters

| Name | Type |
| :------ | :------ |
| `registry` | [`RegistryClient`](../classes/dxos_registry_client.RegistryClient.md) |
| `params` | `Object` |
| `params.name?` | [`DXN`](../classes/dxos_registry_client.DXN.md) |
| `params.owner?` | [`AccountKey`](../classes/dxos_registry_client.AccountKey.md) |
| `params.record?` | [`CID`](../classes/dxos_registry_client.CID.md) |

#### Returns

`Promise`<`void`\>

#### Defined in

[packages/sdk/registry-client/src/testing/fake-data-generator.ts:28](https://github.com/dxos/dxos/blob/32ae9b579/packages/sdk/registry-client/src/testing/fake-data-generator.ts#L28)

___

### registerMockTypeRecord

▸ **registerMockTypeRecord**(`registry`, `params?`): `Promise`<[`CID`](../classes/dxos_registry_client.CID.md)\>

Generates a single random type record.

#### Parameters

| Name | Type |
| :------ | :------ |
| `registry` | [`RegistryClient`](../classes/dxos_registry_client.RegistryClient.md) |
| `params` | `Object` |
| `params.messageName?` | `string` |
| `params.meta?` | [`TypeRecordMetadata`](../interfaces/dxos_registry_client.TypeRecordMetadata.md) |
| `params.protobufDefs?` | `Root` |

#### Returns

`Promise`<[`CID`](../classes/dxos_registry_client.CID.md)\>

#### Defined in

[packages/sdk/registry-client/src/testing/fake-data-generator.ts:78](https://github.com/dxos/dxos/blob/32ae9b579/packages/sdk/registry-client/src/testing/fake-data-generator.ts#L78)

___

### registerMockTypes

▸ **registerMockTypes**(`registry`): `Promise`<[`CID`](../classes/dxos_registry_client.CID.md)[]\>

Generates a static list of predefined type records.

#### Parameters

| Name | Type |
| :------ | :------ |
| `registry` | [`RegistryClient`](../classes/dxos_registry_client.RegistryClient.md) |

#### Returns

`Promise`<[`CID`](../classes/dxos_registry_client.CID.md)[]\>

#### Defined in

[packages/sdk/registry-client/src/testing/fake-data-generator.ts:96](https://github.com/dxos/dxos/blob/32ae9b579/packages/sdk/registry-client/src/testing/fake-data-generator.ts#L96)

___

### sanitizeExtensionData

▸ **sanitizeExtensionData**(`data`, `expectedType`): [`RecordExtension`](dxos_registry_client.md#recordextension)<`any`\>

#### Parameters

| Name | Type |
| :------ | :------ |
| `data` | `unknown` |
| `expectedType` | [`CID`](../classes/dxos_registry_client.CID.md) |

#### Returns

[`RecordExtension`](dxos_registry_client.md#recordextension)<`any`\>

#### Defined in

[packages/sdk/registry-client/src/encoding/encoding.ts:80](https://github.com/dxos/dxos/blob/32ae9b579/packages/sdk/registry-client/src/encoding/encoding.ts#L80)
