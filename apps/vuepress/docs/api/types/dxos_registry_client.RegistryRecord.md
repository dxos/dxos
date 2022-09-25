# Type alias: RegistryRecord<T\>

[@dxos/registry-client](../modules/dxos_registry_client.md).RegistryRecord

 **RegistryRecord**<`T`\>: `Omit`<`RawRecord`, ``"payload"`` \| ``"type"``\> & { `cid`: [`CID`](../classes/dxos_registry_client.CID.md) ; `payload`: [`RecordExtension`](dxos_registry_client.RecordExtension.md)<`T`\>  }

#### Type parameters

| Name | Type |
| :------ | :------ |
| `T` | `any` |

#### Defined in

[packages/sdk/registry-client/src/api/registry-client.ts:31](https://github.com/dxos/dxos/blob/db8188dae/packages/sdk/registry-client/src/api/registry-client.ts#L31)
