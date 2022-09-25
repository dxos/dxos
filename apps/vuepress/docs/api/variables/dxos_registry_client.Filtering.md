# Variable: Filtering

[@dxos/registry-client](../modules/dxos_registry_client.md).Filtering

 `Const` **Filtering**: `Object`

Filtering logic in list methods of the API.

#### Type declaration

| Name | Type |
| :------ | :------ |
| `matchRecord` | (`record`: [`RegistryRecord`](../types/dxos_registry_client.RegistryRecord.md)<`any`\>, `filter?`: [`Filter`](../interfaces/dxos_registry_client.Filter.md)) => `boolean` |
| `matchResource` | (`name`: [`DXN`](../classes/dxos_registry_client.DXN.md), `filter?`: [`Filter`](../interfaces/dxos_registry_client.Filter.md)) => `boolean` |

#### Defined in

[packages/sdk/registry-client/src/api/filtering.ts:27](https://github.com/dxos/dxos/blob/db8188dae/packages/sdk/registry-client/src/api/filtering.ts#L27)
