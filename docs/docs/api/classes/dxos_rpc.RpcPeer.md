# Class: RpcPeer

[@dxos/rpc](../modules/dxos_rpc.md).RpcPeer

A remote procedure call peer.

Provides a away to make RPC calls and get a response back as a promise.
Does not handle encoding/decoding and only works with byte buffers.
For type safe approach see `createRpcClient` and `createRpcServer`.

Must be connected with another instance on the other side via `send`/`receive` methods.
Both sides must be opened before making any RPC calls.

Errors inside the handler get serialized and sent to the other side.

Inspired by JSON-RPC 2.0 https://www.jsonrpc.org/specification.

## Constructors

### constructor

**new RpcPeer**(`_options`)

#### Parameters

| Name | Type |
| :------ | :------ |
| `_options` | [`RpcPeerOptions`](../interfaces/dxos_rpc.RpcPeerOptions.md) |

#### Defined in

[packages/core/mesh/rpc/src/rpc.ts:79](https://github.com/dxos/dxos/blob/main/packages/core/mesh/rpc/src/rpc.ts#L79)

## Properties

### \_clearOpenInterval

 `Private` **\_clearOpenInterval**: `undefined` \| () => `void`

#### Defined in

[packages/core/mesh/rpc/src/rpc.ts:77](https://github.com/dxos/dxos/blob/main/packages/core/mesh/rpc/src/rpc.ts#L77)

___

### \_localStreams

 `Private` `Readonly` **\_localStreams**: `Map`<`number`, `Stream`<`any`\>\>

#### Defined in

[packages/core/mesh/rpc/src/rpc.ts:70](https://github.com/dxos/dxos/blob/main/packages/core/mesh/rpc/src/rpc.ts#L70)

___

### \_nextId

 `Private` **\_nextId**: `number` = `0`

#### Defined in

[packages/core/mesh/rpc/src/rpc.ts:74](https://github.com/dxos/dxos/blob/main/packages/core/mesh/rpc/src/rpc.ts#L74)

___

### \_open

 `Private` **\_open**: `boolean` = `false`

#### Defined in

[packages/core/mesh/rpc/src/rpc.ts:75](https://github.com/dxos/dxos/blob/main/packages/core/mesh/rpc/src/rpc.ts#L75)

___

### \_outgoingRequests

 `Private` `Readonly` **\_outgoingRequests**: `Map`<`number`, `RequestItem`\>

#### Defined in

[packages/core/mesh/rpc/src/rpc.ts:68](https://github.com/dxos/dxos/blob/main/packages/core/mesh/rpc/src/rpc.ts#L68)

___

### \_remoteOpenTrigger

 `Private` `Readonly` **\_remoteOpenTrigger**: `Trigger`

#### Defined in

[packages/core/mesh/rpc/src/rpc.ts:72](https://github.com/dxos/dxos/blob/main/packages/core/mesh/rpc/src/rpc.ts#L72)

___

### \_unsubscribe

 `Private` **\_unsubscribe**: `undefined` \| () => `void`

#### Defined in

[packages/core/mesh/rpc/src/rpc.ts:76](https://github.com/dxos/dxos/blob/main/packages/core/mesh/rpc/src/rpc.ts#L76)

## Methods

### \_callHandler

`Private` **_callHandler**(`req`): `Promise`<`Response`\>

#### Parameters

| Name | Type |
| :------ | :------ |
| `req` | `Request` |

#### Returns

`Promise`<`Response`\>

#### Defined in

[packages/core/mesh/rpc/src/rpc.ts:346](https://github.com/dxos/dxos/blob/main/packages/core/mesh/rpc/src/rpc.ts#L346)

___

### \_callStreamHandler

`Private` **_callStreamHandler**(`req`, `callback`): `void`

#### Parameters

| Name | Type |
| :------ | :------ |
| `req` | `Request` |
| `callback` | (`response`: `Response`) => `void` |

#### Returns

`void`

#### Defined in

[packages/core/mesh/rpc/src/rpc.ts:364](https://github.com/dxos/dxos/blob/main/packages/core/mesh/rpc/src/rpc.ts#L364)

___

### \_receive

`Private` **_receive**(`msg`): `Promise`<`void`\>

Handle incoming message. Should be called as the result of other peer's `send` callback.

#### Parameters

| Name | Type |
| :------ | :------ |
| `msg` | `Uint8Array` |

#### Returns

`Promise`<`void`\>

#### Defined in

[packages/core/mesh/rpc/src/rpc.ts:139](https://github.com/dxos/dxos/blob/main/packages/core/mesh/rpc/src/rpc.ts#L139)

___

### \_sendMessage

`Private` **_sendMessage**(`message`): `Promise`<`void`\>

#### Parameters

| Name | Type |
| :------ | :------ |
| `message` | `RpcMessage` |

#### Returns

`Promise`<`void`\>

#### Defined in

[packages/core/mesh/rpc/src/rpc.ts:342](https://github.com/dxos/dxos/blob/main/packages/core/mesh/rpc/src/rpc.ts#L342)

___

### call

**call**(`method`, `request`): `Promise`<`Any`\>

Make RPC call. Will trigger a handler on the other side.

Peer should be open before making this call.

#### Parameters

| Name | Type |
| :------ | :------ |
| `method` | `string` |
| `request` | `Any` |

#### Returns

`Promise`<`Any`\>

#### Defined in

[packages/core/mesh/rpc/src/rpc.ts:234](https://github.com/dxos/dxos/blob/main/packages/core/mesh/rpc/src/rpc.ts#L234)

___

### callStream

**callStream**(`method`, `request`): `Stream`<`Any`\>

Make RPC call with a streaming response. Will trigger a handler on the other side.

Peer should be open before making this call.

#### Parameters

| Name | Type |
| :------ | :------ |
| `method` | `string` |
| `request` | `Any` |

#### Returns

`Stream`<`Any`\>

#### Defined in

[packages/core/mesh/rpc/src/rpc.ts:286](https://github.com/dxos/dxos/blob/main/packages/core/mesh/rpc/src/rpc.ts#L286)

___

### close

**close**(): `void`

Close the peer. Stop taking or making requests.

#### Returns

`void`

#### Defined in

[packages/core/mesh/rpc/src/rpc.ts:126](https://github.com/dxos/dxos/blob/main/packages/core/mesh/rpc/src/rpc.ts#L126)

___

### open

**open**(): `Promise`<`void`\>

Open the peer. Required before making any calls.

Will block before the other peer calls `open`.

#### Returns

`Promise`<`void`\>

#### Defined in

[packages/core/mesh/rpc/src/rpc.ts:86](https://github.com/dxos/dxos/blob/main/packages/core/mesh/rpc/src/rpc.ts#L86)
