# Interface: RpcPeerOptions

[@dxos/rpc](../modules/dxos_rpc.md).RpcPeerOptions

## Properties

### messageHandler

 **messageHandler**: (`method`: `string`, `request`: `Any`) => `MaybePromise`<`Any`\>

#### Type declaration

(`method`, `request`): `MaybePromise`<`Any`\>

##### Parameters

| Name | Type |
| :------ | :------ |
| `method` | `string` |
| `request` | `Any` |

##### Returns

`MaybePromise`<`Any`\>

#### Defined in

[packages/core/mesh/rpc/src/rpc.ts:25](https://github.com/dxos/dxos/blob/main/packages/core/mesh/rpc/src/rpc.ts#L25)

___

### noHandshake

 `Optional` **noHandshake**: `boolean`

Do not require or send handshake messages.

#### Defined in

[packages/core/mesh/rpc/src/rpc.ts:32](https://github.com/dxos/dxos/blob/main/packages/core/mesh/rpc/src/rpc.ts#L32)

___

### port

 **port**: [`RpcPort`](dxos_rpc.RpcPort.md)

#### Defined in

[packages/core/mesh/rpc/src/rpc.ts:27](https://github.com/dxos/dxos/blob/main/packages/core/mesh/rpc/src/rpc.ts#L27)

___

### streamHandler

 `Optional` **streamHandler**: (`method`: `string`, `request`: `Any`) => `Stream`<`Any`\>

#### Type declaration

(`method`, `request`): `Stream`<`Any`\>

##### Parameters

| Name | Type |
| :------ | :------ |
| `method` | `string` |
| `request` | `Any` |

##### Returns

`Stream`<`Any`\>

#### Defined in

[packages/core/mesh/rpc/src/rpc.ts:26](https://github.com/dxos/dxos/blob/main/packages/core/mesh/rpc/src/rpc.ts#L26)

___

### timeout

 `Optional` **timeout**: `number`

#### Defined in

[packages/core/mesh/rpc/src/rpc.ts:28](https://github.com/dxos/dxos/blob/main/packages/core/mesh/rpc/src/rpc.ts#L28)
