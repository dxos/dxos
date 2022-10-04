# Function: useReducer

[@dxos/react-client](../modules/dxos_react_client.md).useReducer

**useReducer**<`T`, `R`\>(`selection`, `value`, `deps?`): `undefined` \| `R`

Hook to process selection reducer.

#### Type parameters

| Name | Type |
| :------ | :------ |
| `T` | extends `Entity`<`any`, `T`\> |
| `R` | `R` |

#### Parameters

| Name | Type | Default value |
| :------ | :------ | :------ |
| `selection` | `Falsy` \| `Selection`<`T`, `void`\> \| `SelectionResult`<`T`, `any`\> | `undefined` |
| `value` | `R` | `undefined` |
| `deps` | readonly `any`[] | `[]` |

#### Returns

`undefined` \| `R`

#### Defined in

[packages/sdk/react-client/src/hooks/echo-selections/useSelection.ts:54](https://github.com/dxos/dxos/blob/main/packages/sdk/react-client/src/hooks/echo-selections/useSelection.ts#L54)
