# Function: useStream

[@dxos/react-client](../modules/dxos_react_client.md).useStream

**useStream**<`T`\>(`streamFactory`, `defaultValue`, `deps?`): `T`

Subscribe to service API streams.

#### Type parameters

| Name |
| :------ |
| `T` |

#### Parameters

| Name | Type | Default value |
| :------ | :------ | :------ |
| `streamFactory` | () => `Stream`<`T`\> | `undefined` |
| `defaultValue` | `T` | `undefined` |
| `deps` | `DependencyList` | `[]` |

#### Returns

`T`

#### Defined in

[packages/sdk/react-client/src/hooks/util/useStream.ts:12](https://github.com/dxos/dxos/blob/main/packages/sdk/react-client/src/hooks/util/useStream.ts#L12)
