# Function: createIFrame

[@dxos/rpc-tunnel](../modules/dxos_rpc_tunnel.md).createIFrame

**createIFrame**(`source`, `id`): `HTMLIFrameElement`

Create a hidden iframe and insert it into the DOM.
If an element with the same id already exists it will be returned instead.

#### Parameters

| Name | Type | Description |
| :------ | :------ | :------ |
| `source` | `string` | Source of the iframe. |
| `id` | `string` | DOM id of the iframe. |

#### Returns

`HTMLIFrameElement`

The created iframe.

#### Defined in

[packages/core/mesh/rpc-tunnel/src/ports/iframe.ts:85](https://github.com/dxos/dxos/blob/main/packages/core/mesh/rpc-tunnel/src/ports/iframe.ts#L85)
