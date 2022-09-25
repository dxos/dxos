# Type alias: ParseKey<K\>

[@dxos/config](../modules/dxos_config.md).ParseKey

 **ParseKey**<`K`\>: `K` extends \`${infer L}.${infer Rest}\` ? [`L`, ...ParseKey<Rest\>] : [`K`]

Parse a dot separated nested key into an array of keys.

Example: 'services.signal.server' -> ['services', 'signal', 'server'].

#### Type parameters

| Name | Type |
| :------ | :------ |
| `K` | extends `string` |

#### Defined in

[packages/sdk/config/src/types.ts:36](https://github.com/dxos/dxos/blob/db8188dae/packages/sdk/config/src/types.ts#L36)
