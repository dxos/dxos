# Function: treeLogger

[@dxos/client-testing](../modules/dxos_client_testing.md).treeLogger

**treeLogger**(`node`, `ancestors?`, `rows?`): `string`

Create tree using depth first traversal.
https://waylonwalker.com/drawing-ascii-boxes/#connectors

#### Parameters

| Name | Type | Default value |
| :------ | :------ | :------ |
| `node` | [`TreeNode`](../types/dxos_client_testing.TreeNode.md) | `undefined` |
| `ancestors` | [[`TreeNode`](../types/dxos_client_testing.TreeNode.md), `number`][] | `[]` |
| `rows` | `string`[] | `[]` |

#### Returns

`string`

#### Defined in

[packages/sdk/client-testing/src/logging/tree.ts:26](https://github.com/dxos/dxos/blob/main/packages/sdk/client-testing/src/logging/tree.ts#L26)
