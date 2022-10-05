# Interface: ProtocolOptions

[@dxos/mesh-protocol](../modules/dxos_mesh_protocol.md).ProtocolOptions

## Properties

### codec

 `Optional` **codec**: `Codec`<`any`\>

Define a codec to encode/decode messages from extensions.

#### Defined in

[packages/core/mesh/mesh-protocol/src/protocol.ts:55](https://github.com/dxos/dxos/blob/main/packages/core/mesh/mesh-protocol/src/protocol.ts#L55)

___

### discovery_key

 `Optional` **discovery_key**: `Buffer`

#### Defined in

[packages/core/mesh/mesh-protocol/src/protocol.ts:48](https://github.com/dxos/dxos/blob/main/packages/core/mesh/mesh-protocol/src/protocol.ts#L48)

___

### discoveryToPublicKey

 `Optional` **discoveryToPublicKey**: (`discovery_key`: `Buffer`) => `undefined` \| `Buffer`

#### Type declaration

(`discovery_key`): `undefined` \| `Buffer`

##### Parameters

| Name | Type |
| :------ | :------ |
| `discovery_key` | `Buffer` |

##### Returns

`undefined` \| `Buffer`

#### Defined in

[packages/core/mesh/mesh-protocol/src/protocol.ts:42](https://github.com/dxos/dxos/blob/main/packages/core/mesh/mesh-protocol/src/protocol.ts#L42)

___

### initTimeout

 `Optional` **initTimeout**: `number`

#### Defined in

[packages/core/mesh/mesh-protocol/src/protocol.ts:50](https://github.com/dxos/dxos/blob/main/packages/core/mesh/mesh-protocol/src/protocol.ts#L50)

___

### initiator

 **initiator**: `boolean`

#### Defined in

[packages/core/mesh/mesh-protocol/src/protocol.ts:57](https://github.com/dxos/dxos/blob/main/packages/core/mesh/mesh-protocol/src/protocol.ts#L57)

___

### streamOptions

 `Optional` **streamOptions**: [`ProtocolStreamOptions`](dxos_mesh_protocol.ProtocolStreamOptions.md)

https://github.com/mafintosh/hypercore-protocol#var-stream--protocoloptions

#### Defined in

[packages/core/mesh/mesh-protocol/src/protocol.ts:46](https://github.com/dxos/dxos/blob/main/packages/core/mesh/mesh-protocol/src/protocol.ts#L46)

___

### userSession

 `Optional` **userSession**: `Record`<`string`, `any`\>

#### Defined in

[packages/core/mesh/mesh-protocol/src/protocol.ts:58](https://github.com/dxos/dxos/blob/main/packages/core/mesh/mesh-protocol/src/protocol.ts#L58)
