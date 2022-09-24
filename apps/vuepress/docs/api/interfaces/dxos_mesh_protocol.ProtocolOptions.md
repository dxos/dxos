# Interface: ProtocolOptions

[@dxos/mesh-protocol](../modules/dxos_mesh_protocol.md).ProtocolOptions

## Table of contents

### Properties

- [codec](dxos_mesh_protocol.ProtocolOptions.md#codec)
- [discoveryKey](dxos_mesh_protocol.ProtocolOptions.md#discoverykey)
- [discoveryToPublicKey](dxos_mesh_protocol.ProtocolOptions.md#discoverytopublickey)
- [initTimeout](dxos_mesh_protocol.ProtocolOptions.md#inittimeout)
- [initiator](dxos_mesh_protocol.ProtocolOptions.md#initiator)
- [streamOptions](dxos_mesh_protocol.ProtocolOptions.md#streamoptions)
- [userSession](dxos_mesh_protocol.ProtocolOptions.md#usersession)

## Properties

### codec

• `Optional` **codec**: `Codec`<`any`\>

Define a codec to encode/decode messages from extensions.

#### Defined in

[packages/mesh/mesh-protocol/src/protocol.ts:55](https://github.com/dxos/dxos/blob/e3b936721/packages/mesh/mesh-protocol/src/protocol.ts#L55)

___

### discoveryKey

• `Optional` **discoveryKey**: `Buffer`

#### Defined in

[packages/mesh/mesh-protocol/src/protocol.ts:48](https://github.com/dxos/dxos/blob/e3b936721/packages/mesh/mesh-protocol/src/protocol.ts#L48)

___

### discoveryToPublicKey

• `Optional` **discoveryToPublicKey**: (`discoveryKey`: `Buffer`) => `undefined` \| `Buffer`

#### Type declaration

▸ (`discoveryKey`): `undefined` \| `Buffer`

##### Parameters

| Name | Type |
| :------ | :------ |
| `discoveryKey` | `Buffer` |

##### Returns

`undefined` \| `Buffer`

#### Defined in

[packages/mesh/mesh-protocol/src/protocol.ts:42](https://github.com/dxos/dxos/blob/e3b936721/packages/mesh/mesh-protocol/src/protocol.ts#L42)

___

### initTimeout

• `Optional` **initTimeout**: `number`

#### Defined in

[packages/mesh/mesh-protocol/src/protocol.ts:50](https://github.com/dxos/dxos/blob/e3b936721/packages/mesh/mesh-protocol/src/protocol.ts#L50)

___

### initiator

• **initiator**: `boolean`

#### Defined in

[packages/mesh/mesh-protocol/src/protocol.ts:57](https://github.com/dxos/dxos/blob/e3b936721/packages/mesh/mesh-protocol/src/protocol.ts#L57)

___

### streamOptions

• `Optional` **streamOptions**: [`ProtocolStreamOptions`](dxos_mesh_protocol.ProtocolStreamOptions.md)

https://github.com/mafintosh/hypercore-protocol#var-stream--protocoloptions

#### Defined in

[packages/mesh/mesh-protocol/src/protocol.ts:46](https://github.com/dxos/dxos/blob/e3b936721/packages/mesh/mesh-protocol/src/protocol.ts#L46)

___

### userSession

• `Optional` **userSession**: `Record`<`string`, `any`\>

#### Defined in

[packages/mesh/mesh-protocol/src/protocol.ts:58](https://github.com/dxos/dxos/blob/e3b936721/packages/mesh/mesh-protocol/src/protocol.ts#L58)
