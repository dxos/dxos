# Function: decodeExtensionPayload

[@dxos/registry-client](../modules/dxos_registry_client.md).decodeExtensionPayload

**decodeExtensionPayload**(`extension`, `resolveType`): `Promise`<[`RecordExtension`](../types/dxos_registry_client.RecordExtension.md)<`any`\>\>

#### Parameters

| Name | Type |
| :------ | :------ |
| `extension` | `Extension` |
| `resolveType` | (`cid`: [`CID`](../classes/dxos_registry_client.CID.md)) => `Promise`<[`RegistryType`](../types/dxos_registry_client.RegistryType.md)\> |

#### Returns

`Promise`<[`RecordExtension`](../types/dxos_registry_client.RecordExtension.md)<`any`\>\>

#### Defined in

[packages/sdk/registry-client/src/encoding/encoding.ts:30](https://github.com/dxos/dxos/blob/db8188dae/packages/sdk/registry-client/src/encoding/encoding.ts#L30)
