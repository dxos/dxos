# Function: useSelection

[@dxos/react-client](../modules/dxos_react_client.md).useSelection

**useSelection**<`T`\>(`selection`, `deps?`): `undefined` \| `T`[]

Hook to generate values from a selection using a selector function.

NOTE:
All values that may change the selection result,
apart from changes in ECHO database itself, must be passed to deps array
for updates to work correctly.

#### Type parameters

| Name | Type |
| :------ | :------ |
| `T` | extends `Entity`<`any`, `T`\> |

#### Parameters

| Name | Type | Default value | Description |
| :------ | :------ | :------ | :------ |
| `selection` | `Selection`<`T`, `void`\> \| `SelectionResult`<`T`, `any`\> \| `Falsy` | `undefined` | Selection from which to query data. Can be falsy - in that case the hook will return undefined. |
| `deps` | readonly `any`[] | `[]` | Array of values that trigger the selector when changed. |

#### Returns

`undefined` \| `T`[]

#### Defined in

[packages/sdk/react-client/src/hooks/echo-selections/useSelection.ts:21](https://github.com/dxos/dxos/blob/main/packages/sdk/react-client/src/hooks/echo-selections/useSelection.ts#L21)
