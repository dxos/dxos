# Function: encodeExtensionPayload

[@dxos/registry-client](../modules/dxos_registry_client.md).encodeExtensionPayload

**encodeExtensionPayload**(`data`, `resolveType`): `Promise`<`Extension`\>

#### Parameters

| Name | Type |
| :------ | :------ |
| `data` | [`RecordExtension`](../types/dxos_registry_client.RecordExtension.md)<`any`\> |
| `resolveType` | (`cid`: [`CID`](../classes/dxos_registry_client.CID.md)) => `Promise`<[`RegistryType`](../types/dxos_registry_client.RegistryType.md)\> |

#### Returns

`Promise`<`Extension`\>

#### Defined in

[packages/sdk/registry-client/src/encoding/encoding.ts:56](https://github.com/dxos/dxos/blob/db8188dae/packages/sdk/registry-client/src/encoding/encoding.ts#L56)
