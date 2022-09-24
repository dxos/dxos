# Module: @dxos/protocol-plugin-rpc

## Table of contents

### Classes

- [PluginRpc](../classes/dxos_protocol_plugin_rpc.PluginRpc.md)

### Functions

- [createPort](dxos_protocol_plugin_rpc.md#createport)
- [getPeerId](dxos_protocol_plugin_rpc.md#getpeerid)

## Functions

### createPort

▸ **createPort**(`peer`, `receive`): `Promise`<`RpcPort`\>

#### Parameters

| Name | Type |
| :------ | :------ |
| `peer` | `Protocol` |
| `receive` | `Event`<`SerializedObject`\> |

#### Returns

`Promise`<`RpcPort`\>

#### Defined in

[packages/mesh/protocol-plugin-rpc/src/plugin-rpc.ts:29](https://github.com/dxos/dxos/blob/32ae9b579/packages/mesh/protocol-plugin-rpc/src/plugin-rpc.ts#L29)

___

### getPeerId

▸ **getPeerId**(`peer`): `string`

#### Parameters

| Name | Type |
| :------ | :------ |
| `peer` | `Protocol` |

#### Returns

`string`

#### Defined in

[packages/mesh/protocol-plugin-rpc/src/plugin-rpc.ts:24](https://github.com/dxos/dxos/blob/32ae9b579/packages/mesh/protocol-plugin-rpc/src/plugin-rpc.ts#L24)
