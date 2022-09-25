# Function: pipeProtocols

[@dxos/mesh-protocol](../modules/dxos_mesh_protocol.md).pipeProtocols

**pipeProtocols**(`a`, `b`): `Promise`<`void`\>

Connect two protocols in-memory.
If protocol is closed because of an error, this error will be propagated through the returned promise.

#### Parameters

| Name | Type |
| :------ | :------ |
| `a` | [`Protocol`](../classes/dxos_mesh_protocol.Protocol.md) |
| `b` | [`Protocol`](../classes/dxos_mesh_protocol.Protocol.md) |

#### Returns

`Promise`<`void`\>

#### Defined in

[packages/mesh/mesh-protocol/src/testing/util.ts:17](https://github.com/dxos/dxos/blob/db8188dae/packages/mesh/mesh-protocol/src/testing/util.ts#L17)
