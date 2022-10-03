# Interface: ProtoRpcPeerOptions<Client, Server\>

[@dxos/rpc](../modules/dxos_rpc.md).ProtoRpcPeerOptions

## Type parameters

| Name |
| :------ |
| `Client` |
| `Server` |

## Hierarchy

- `Omit`<[`RpcPeerOptions`](dxos_rpc.RpcPeerOptions.md), ``"messageHandler"`` \| ``"streamHandler"``\>

  ↳ **`ProtoRpcPeerOptions`**

## Properties

### encodingOptions

 `Optional` **encodingOptions**: `EncodingOptions`

Encoding options passed to the underlying proto codec.

#### Defined in

[packages/core/mesh/rpc/src/service.ts:53](https://github.com/dxos/dxos/blob/main/packages/core/mesh/rpc/src/service.ts#L53)

___

### exposed

 **exposed**: [`ServiceBundle`](../types/dxos_rpc.ServiceBundle.md)<`Server`\>

Services exposed to the counter-party.

#### Defined in

[packages/core/mesh/rpc/src/service.ts:43](https://github.com/dxos/dxos/blob/main/packages/core/mesh/rpc/src/service.ts#L43)

___

### handlers

 **handlers**: `Server`

Handlers for the exposed services

#### Defined in

[packages/core/mesh/rpc/src/service.ts:48](https://github.com/dxos/dxos/blob/main/packages/core/mesh/rpc/src/service.ts#L48)

___

### noHandshake

 `Optional` **noHandshake**: `boolean`

Do not require or send handshake messages.

#### Inherited from

Omit.noHandshake

#### Defined in

[packages/core/mesh/rpc/src/rpc.ts:32](https://github.com/dxos/dxos/blob/main/packages/core/mesh/rpc/src/rpc.ts#L32)

___

### port

 **port**: [`RpcPort`](dxos_rpc.RpcPort.md)

#### Inherited from

Omit.port

#### Defined in

[packages/core/mesh/rpc/src/rpc.ts:27](https://github.com/dxos/dxos/blob/main/packages/core/mesh/rpc/src/rpc.ts#L27)

___

### requested

 **requested**: [`ServiceBundle`](../types/dxos_rpc.ServiceBundle.md)<`Client`\>

Services that are expected to be serviced by the counter-party.

#### Defined in

[packages/core/mesh/rpc/src/service.ts:38](https://github.com/dxos/dxos/blob/main/packages/core/mesh/rpc/src/service.ts#L38)

___

### timeout

 `Optional` **timeout**: `number`

#### Inherited from

Omit.timeout

#### Defined in

[packages/core/mesh/rpc/src/rpc.ts:28](https://github.com/dxos/dxos/blob/main/packages/core/mesh/rpc/src/rpc.ts#L28)
