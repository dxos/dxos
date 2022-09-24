# Module: @dxos/mesh-protocol

## Table of contents

### Classes

- [ERR\_EXTENSION\_RESPONSE\_FAILED](../classes/dxos_mesh_protocol.ERR_EXTENSION_RESPONSE_FAILED.md)
- [Extension](../classes/dxos_mesh_protocol.Extension.md)
- [Protocol](../classes/dxos_mesh_protocol.Protocol.md)

### Interfaces

- [ExtensionOptions](../interfaces/dxos_mesh_protocol.ExtensionOptions.md)
- [ProtocolOptions](../interfaces/dxos_mesh_protocol.ProtocolOptions.md)
- [ProtocolStreamOptions](../interfaces/dxos_mesh_protocol.ProtocolStreamOptions.md)

### Type Aliases

- [CloseHandler](dxos_mesh_protocol.md#closehandler)
- [FeedHandler](dxos_mesh_protocol.md#feedhandler)
- [HandshakeHandler](dxos_mesh_protocol.md#handshakehandler)
- [InitHandler](dxos_mesh_protocol.md#inithandler)
- [MessageHandler](dxos_mesh_protocol.md#messagehandler)

### Variables

- [ERR\_EXTENSION\_CLOSE\_FAILED](dxos_mesh_protocol.md#err_extension_close_failed)
- [ERR\_EXTENSION\_FEED\_FAILED](dxos_mesh_protocol.md#err_extension_feed_failed)
- [ERR\_EXTENSION\_HANDSHAKE\_FAILED](dxos_mesh_protocol.md#err_extension_handshake_failed)
- [ERR\_EXTENSION\_INIT\_FAILED](dxos_mesh_protocol.md#err_extension_init_failed)
- [ERR\_EXTENSION\_RESPONSE\_TIMEOUT](dxos_mesh_protocol.md#err_extension_response_timeout)
- [ERR\_PROTOCOL\_CONNECTION\_INVALID](dxos_mesh_protocol.md#err_protocol_connection_invalid)
- [ERR\_PROTOCOL\_EXTENSION\_MISSING](dxos_mesh_protocol.md#err_protocol_extension_missing)
- [ERR\_PROTOCOL\_HANDSHAKE\_FAILED](dxos_mesh_protocol.md#err_protocol_handshake_failed)
- [ERR\_PROTOCOL\_INIT\_INVALID](dxos_mesh_protocol.md#err_protocol_init_invalid)
- [ERR\_PROTOCOL\_STREAM\_CLOSED](dxos_mesh_protocol.md#err_protocol_stream_closed)

### Functions

- [createTestProtocolPair](dxos_mesh_protocol.md#createtestprotocolpair)
- [getProtocolFromStream](dxos_mesh_protocol.md#getprotocolfromstream)
- [pipeProtocols](dxos_mesh_protocol.md#pipeprotocols)

## Type Aliases

### CloseHandler

Ƭ **CloseHandler**: (`protocol`: [`Protocol`](../classes/dxos_mesh_protocol.Protocol.md)) => `Promise`<`void`\> \| `void`

#### Type declaration

▸ (`protocol`): `Promise`<`void`\> \| `void`

##### Parameters

| Name | Type |
| :------ | :------ |
| `protocol` | [`Protocol`](../classes/dxos_mesh_protocol.Protocol.md) |

##### Returns

`Promise`<`void`\> \| `void`

#### Defined in

[packages/mesh/mesh-protocol/src/extension.ts:42](https://github.com/dxos/dxos/blob/32ae9b579/packages/mesh/mesh-protocol/src/extension.ts#L42)

___

### FeedHandler

Ƭ **FeedHandler**: (`protocol`: [`Protocol`](../classes/dxos_mesh_protocol.Protocol.md), `discoveryKey`: `Buffer`) => `Promise`<`void`\> \| `void`

#### Type declaration

▸ (`protocol`, `discoveryKey`): `Promise`<`void`\> \| `void`

##### Parameters

| Name | Type |
| :------ | :------ |
| `protocol` | [`Protocol`](../classes/dxos_mesh_protocol.Protocol.md) |
| `discoveryKey` | `Buffer` |

##### Returns

`Promise`<`void`\> \| `void`

#### Defined in

[packages/mesh/mesh-protocol/src/extension.ts:44](https://github.com/dxos/dxos/blob/32ae9b579/packages/mesh/mesh-protocol/src/extension.ts#L44)

___

### HandshakeHandler

Ƭ **HandshakeHandler**: (`protocol`: [`Protocol`](../classes/dxos_mesh_protocol.Protocol.md)) => `Promise`<`void`\> \| `void`

#### Type declaration

▸ (`protocol`): `Promise`<`void`\> \| `void`

##### Parameters

| Name | Type |
| :------ | :------ |
| `protocol` | [`Protocol`](../classes/dxos_mesh_protocol.Protocol.md) |

##### Returns

`Promise`<`void`\> \| `void`

#### Defined in

[packages/mesh/mesh-protocol/src/extension.ts:41](https://github.com/dxos/dxos/blob/32ae9b579/packages/mesh/mesh-protocol/src/extension.ts#L41)

___

### InitHandler

Ƭ **InitHandler**: (`protocol`: [`Protocol`](../classes/dxos_mesh_protocol.Protocol.md)) => `Promise`<`void`\> \| `void`

#### Type declaration

▸ (`protocol`): `Promise`<`void`\> \| `void`

##### Parameters

| Name | Type |
| :------ | :------ |
| `protocol` | [`Protocol`](../classes/dxos_mesh_protocol.Protocol.md) |

##### Returns

`Promise`<`void`\> \| `void`

#### Defined in

[packages/mesh/mesh-protocol/src/extension.ts:40](https://github.com/dxos/dxos/blob/32ae9b579/packages/mesh/mesh-protocol/src/extension.ts#L40)

___

### MessageHandler

Ƭ **MessageHandler**: (`protocol`: [`Protocol`](../classes/dxos_mesh_protocol.Protocol.md), `message`: `any`) => `Promise`<`any`\> \| `void`

#### Type declaration

▸ (`protocol`, `message`): `Promise`<`any`\> \| `void`

##### Parameters

| Name | Type |
| :------ | :------ |
| `protocol` | [`Protocol`](../classes/dxos_mesh_protocol.Protocol.md) |
| `message` | `any` |

##### Returns

`Promise`<`any`\> \| `void`

#### Defined in

[packages/mesh/mesh-protocol/src/extension.ts:43](https://github.com/dxos/dxos/blob/32ae9b579/packages/mesh/mesh-protocol/src/extension.ts#L43)

## Variables

### ERR\_EXTENSION\_CLOSE\_FAILED

• `Const` **ERR\_EXTENSION\_CLOSE\_FAILED**: typeof `Nanoerror`

#### Defined in

[packages/mesh/mesh-protocol/src/errors.ts:16](https://github.com/dxos/dxos/blob/32ae9b579/packages/mesh/mesh-protocol/src/errors.ts#L16)

___

### ERR\_EXTENSION\_FEED\_FAILED

• `Const` **ERR\_EXTENSION\_FEED\_FAILED**: typeof `Nanoerror`

#### Defined in

[packages/mesh/mesh-protocol/src/errors.ts:15](https://github.com/dxos/dxos/blob/32ae9b579/packages/mesh/mesh-protocol/src/errors.ts#L15)

___

### ERR\_EXTENSION\_HANDSHAKE\_FAILED

• `Const` **ERR\_EXTENSION\_HANDSHAKE\_FAILED**: typeof `Nanoerror`

#### Defined in

[packages/mesh/mesh-protocol/src/errors.ts:14](https://github.com/dxos/dxos/blob/32ae9b579/packages/mesh/mesh-protocol/src/errors.ts#L14)

___

### ERR\_EXTENSION\_INIT\_FAILED

• `Const` **ERR\_EXTENSION\_INIT\_FAILED**: typeof `Nanoerror`

#### Defined in

[packages/mesh/mesh-protocol/src/errors.ts:13](https://github.com/dxos/dxos/blob/32ae9b579/packages/mesh/mesh-protocol/src/errors.ts#L13)

___

### ERR\_EXTENSION\_RESPONSE\_TIMEOUT

• `Const` **ERR\_EXTENSION\_RESPONSE\_TIMEOUT**: typeof `Nanoerror`

#### Defined in

[packages/mesh/mesh-protocol/src/errors.ts:17](https://github.com/dxos/dxos/blob/32ae9b579/packages/mesh/mesh-protocol/src/errors.ts#L17)

___

### ERR\_PROTOCOL\_CONNECTION\_INVALID

• `Const` **ERR\_PROTOCOL\_CONNECTION\_INVALID**: typeof `Nanoerror`

#### Defined in

[packages/mesh/mesh-protocol/src/errors.ts:10](https://github.com/dxos/dxos/blob/32ae9b579/packages/mesh/mesh-protocol/src/errors.ts#L10)

___

### ERR\_PROTOCOL\_EXTENSION\_MISSING

• `Const` **ERR\_PROTOCOL\_EXTENSION\_MISSING**: typeof `Nanoerror`

#### Defined in

[packages/mesh/mesh-protocol/src/errors.ts:11](https://github.com/dxos/dxos/blob/32ae9b579/packages/mesh/mesh-protocol/src/errors.ts#L11)

___

### ERR\_PROTOCOL\_HANDSHAKE\_FAILED

• `Const` **ERR\_PROTOCOL\_HANDSHAKE\_FAILED**: typeof `Nanoerror`

#### Defined in

[packages/mesh/mesh-protocol/src/errors.ts:9](https://github.com/dxos/dxos/blob/32ae9b579/packages/mesh/mesh-protocol/src/errors.ts#L9)

___

### ERR\_PROTOCOL\_INIT\_INVALID

• `Const` **ERR\_PROTOCOL\_INIT\_INVALID**: typeof `Nanoerror`

#### Defined in

[packages/mesh/mesh-protocol/src/errors.ts:8](https://github.com/dxos/dxos/blob/32ae9b579/packages/mesh/mesh-protocol/src/errors.ts#L8)

___

### ERR\_PROTOCOL\_STREAM\_CLOSED

• `Const` **ERR\_PROTOCOL\_STREAM\_CLOSED**: typeof `Nanoerror`

#### Defined in

[packages/mesh/mesh-protocol/src/errors.ts:7](https://github.com/dxos/dxos/blob/32ae9b579/packages/mesh/mesh-protocol/src/errors.ts#L7)

## Functions

### createTestProtocolPair

▸ **createTestProtocolPair**(`extensions1`, `extensions2`): `void`

Returns a pair of connected protocols.

#### Parameters

| Name | Type |
| :------ | :------ |
| `extensions1` | [`Extension`](../classes/dxos_mesh_protocol.Extension.md)[] |
| `extensions2` | [`Extension`](../classes/dxos_mesh_protocol.Extension.md)[] |

#### Returns

`void`

#### Defined in

[packages/mesh/mesh-protocol/src/testing/util.ts:23](https://github.com/dxos/dxos/blob/32ae9b579/packages/mesh/mesh-protocol/src/testing/util.ts#L23)

___

### getProtocolFromStream

▸ **getProtocolFromStream**(`stream`): [`Protocol`](../classes/dxos_mesh_protocol.Protocol.md)

#### Parameters

| Name | Type |
| :------ | :------ |
| `stream` | `any` |

#### Returns

[`Protocol`](../classes/dxos_mesh_protocol.Protocol.md)

#### Defined in

[packages/mesh/mesh-protocol/src/protocol.ts:402](https://github.com/dxos/dxos/blob/32ae9b579/packages/mesh/mesh-protocol/src/protocol.ts#L402)

___

### pipeProtocols

▸ **pipeProtocols**(`a`, `b`): `Promise`<`void`\>

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

[packages/mesh/mesh-protocol/src/testing/util.ts:17](https://github.com/dxos/dxos/blob/32ae9b579/packages/mesh/mesh-protocol/src/testing/util.ts#L17)
