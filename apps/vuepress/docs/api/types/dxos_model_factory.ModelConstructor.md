# Type alias: ModelConstructor<M\>

[@dxos/model-factory](../modules/dxos_model_factory.md).ModelConstructor

 **ModelConstructor**<`M`\>: (`meta`: [`ModelMeta`](dxos_model_factory.ModelMeta.md), `itemId`: `ItemID`, `getState`: () => [`StateOf`](dxos_model_factory.StateOf.md)<`M`\>, `MutationWriter?`: [`MutationWriter`](dxos_model_factory.MutationWriter.md)<[`MutationOf`](dxos_model_factory.MutationOf.md)<`M`\>\>) => `M` & { `meta`: [`ModelMeta`](dxos_model_factory.ModelMeta.md)  }

#### Type parameters

| Name | Type |
| :------ | :------ |
| `M` | extends [`Model`](../classes/dxos_model_factory.Model.md) |

#### Defined in

[packages/echo/model-factory/src/types.ts:85](https://github.com/dxos/dxos/blob/db8188dae/packages/echo/model-factory/src/types.ts#L85)
