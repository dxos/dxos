# Function: registerMockTypeRecord

[@dxos/registry-client](../modules/dxos_registry_client.md).registerMockTypeRecord

**registerMockTypeRecord**(`registry`, `params?`): `Promise`<[`CID`](../classes/dxos_registry_client.CID.md)\>

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

[packages/sdk/registry-client/src/testing/fake-data-generator.ts:78](https://github.com/dxos/dxos/blob/db8188dae/packages/sdk/registry-client/src/testing/fake-data-generator.ts#L78)
