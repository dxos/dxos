# Function: registerMockRecord

[@dxos/registry-client](../modules/dxos_registry_client.md).registerMockRecord

**registerMockRecord**(`registry`, `params`): `Promise`<[`CID`](../classes/dxos_registry_client.CID.md)\>

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

[packages/sdk/registry-client/src/testing/fake-data-generator.ts:41](https://github.com/dxos/dxos/blob/main/packages/sdk/registry-client/src/testing/fake-data-generator.ts#L41)
