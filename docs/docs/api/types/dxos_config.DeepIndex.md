# Type alias: DeepIndex<T, KS, Fail\>

[@dxos/config](../modules/dxos_config.md).DeepIndex

 **DeepIndex**<`T`, `KS`, `Fail`\>: `KS` extends [infer F, ...(infer R)] ? `F` extends keyof `Exclude`<`T`, `undefined`\> ? `R` extends `Keys` ? [`DeepIndex`](dxos_config.DeepIndex.md)<`Exclude`<`T`, `undefined`\>[`F`], `R`, `Fail`\> : `Fail` : `Fail` : `T`

Retrieves a property type in a series of nested objects.

Read more: https://stackoverflow.com/a/61648690.

#### Type parameters

| Name | Type |
| :------ | :------ |
| `T` | `T` |
| `KS` | extends `Keys` |
| `Fail` | `undefined` |

#### Defined in

[packages/sdk/config/src/types.ts:48](https://github.com/dxos/dxos/blob/main/packages/sdk/config/src/types.ts#L48)
