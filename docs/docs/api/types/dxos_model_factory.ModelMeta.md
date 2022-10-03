# Type alias: ModelMeta<TState, TMutation, TSnasphot\>

[@dxos/model-factory](../modules/dxos_model_factory.md).ModelMeta

 **ModelMeta**<`TState`, `TMutation`, `TSnasphot`\>: `Object`

Model configuration.

#### Type parameters

| Name | Type |
| :------ | :------ |
| `TState` | `any` |
| `TMutation` | `any` |
| `TSnasphot` | `any` |

#### Type declaration

| Name | Type |
| :------ | :------ |
| `mutationCodec` | `Codec`<`TMutation`\> |
| `snapshotCodec?` | `Codec`<`TSnasphot`\> |
| `stateMachine` | () => [`StateMachine`](../interfaces/dxos_model_factory.StateMachine.md)<`TState`, `TMutation`, `TSnasphot`\> |
| `type` | [`ModelType`](dxos_model_factory.ModelType.md) |
| `getInitMutation?` | (`props`: `any`) => `Promise`<`any`\> |

#### Defined in

[packages/core/echo/model-factory/src/types.ts:59](https://github.com/dxos/dxos/blob/main/packages/core/echo/model-factory/src/types.ts#L59)
