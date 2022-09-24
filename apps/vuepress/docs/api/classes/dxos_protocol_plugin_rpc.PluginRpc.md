# Class: PluginRpc

[@dxos/protocol-plugin-rpc](../modules/dxos_protocol_plugin_rpc.md).PluginRpc

## Table of contents

### Constructors

- [constructor](dxos_protocol_plugin_rpc.PluginRpc.md#constructor)

### Properties

- [\_peers](dxos_protocol_plugin_rpc.PluginRpc.md#_peers)
- [extensionName](dxos_protocol_plugin_rpc.PluginRpc.md#extensionname)

### Methods

- [\_onMessage](dxos_protocol_plugin_rpc.PluginRpc.md#_onmessage)
- [\_onPeerConnect](dxos_protocol_plugin_rpc.PluginRpc.md#_onpeerconnect)
- [\_onPeerDisconnect](dxos_protocol_plugin_rpc.PluginRpc.md#_onpeerdisconnect)
- [close](dxos_protocol_plugin_rpc.PluginRpc.md#close)
- [createExtension](dxos_protocol_plugin_rpc.PluginRpc.md#createextension)

## Constructors

### constructor

• **new PluginRpc**(`_onConnect`)

#### Parameters

| Name | Type |
| :------ | :------ |
| `_onConnect` | `OnConnect` |

#### Defined in

[packages/mesh/protocol-plugin-rpc/src/plugin-rpc.ts:49](https://github.com/dxos/dxos/blob/32ae9b579/packages/mesh/protocol-plugin-rpc/src/plugin-rpc.ts#L49)

## Properties

### \_peers

• `Private` **\_peers**: `Map`<`string`, `Connection`\>

#### Defined in

[packages/mesh/protocol-plugin-rpc/src/plugin-rpc.ts:47](https://github.com/dxos/dxos/blob/32ae9b579/packages/mesh/protocol-plugin-rpc/src/plugin-rpc.ts#L47)

___

### extensionName

▪ `Static` **extensionName**: `string` = `'dxos.mesh.protocol.rpc'`

#### Defined in

[packages/mesh/protocol-plugin-rpc/src/plugin-rpc.ts:45](https://github.com/dxos/dxos/blob/32ae9b579/packages/mesh/protocol-plugin-rpc/src/plugin-rpc.ts#L45)

## Methods

### \_onMessage

▸ `Private` **_onMessage**(`peer`, `data`): `void`

#### Parameters

| Name | Type |
| :------ | :------ |
| `peer` | `Protocol` |
| `data` | `any` |

#### Returns

`void`

#### Defined in

[packages/mesh/protocol-plugin-rpc/src/plugin-rpc.ts:81](https://github.com/dxos/dxos/blob/32ae9b579/packages/mesh/protocol-plugin-rpc/src/plugin-rpc.ts#L81)

___

### \_onPeerConnect

▸ `Private` **_onPeerConnect**(`peer`): `Promise`<`void`\>

#### Parameters

| Name | Type |
| :------ | :------ |
| `peer` | `Protocol` |

#### Returns

`Promise`<`void`\>

#### Defined in

[packages/mesh/protocol-plugin-rpc/src/plugin-rpc.ts:58](https://github.com/dxos/dxos/blob/32ae9b579/packages/mesh/protocol-plugin-rpc/src/plugin-rpc.ts#L58)

___

### \_onPeerDisconnect

▸ `Private` **_onPeerDisconnect**(`peer`): `Promise`<`void`\>

#### Parameters

| Name | Type |
| :------ | :------ |
| `peer` | `Protocol` |

#### Returns

`Promise`<`void`\>

#### Defined in

[packages/mesh/protocol-plugin-rpc/src/plugin-rpc.ts:72](https://github.com/dxos/dxos/blob/32ae9b579/packages/mesh/protocol-plugin-rpc/src/plugin-rpc.ts#L72)

___

### close

▸ **close**(): `Promise`<`void`\>

#### Returns

`Promise`<`void`\>

#### Defined in

[packages/mesh/protocol-plugin-rpc/src/plugin-rpc.ts:89](https://github.com/dxos/dxos/blob/32ae9b579/packages/mesh/protocol-plugin-rpc/src/plugin-rpc.ts#L89)

___

### createExtension

▸ **createExtension**(): `Extension`

#### Returns

`Extension`

#### Defined in

[packages/mesh/protocol-plugin-rpc/src/plugin-rpc.ts:51](https://github.com/dxos/dxos/blob/32ae9b579/packages/mesh/protocol-plugin-rpc/src/plugin-rpc.ts#L51)
