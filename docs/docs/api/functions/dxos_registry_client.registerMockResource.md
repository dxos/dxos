# Function: registerMockResource

[@dxos/registry-client](../modules/dxos_registry_client.md).registerMockResource

**registerMockResource**(`registry`, `params?`): `Promise`<`void`\>

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

[packages/sdk/registry-client/src/testing/fake-data-generator.ts:28](https://github.com/dxos/dxos/blob/main/packages/sdk/registry-client/src/testing/fake-data-generator.ts#L28)
