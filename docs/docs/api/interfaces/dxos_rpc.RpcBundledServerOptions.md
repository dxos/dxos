# Interface: RpcBundledServerOptions<S\>

[@dxos/rpc](../modules/dxos_rpc.md).RpcBundledServerOptions

**`Deprecated`**

## Type parameters

| Name |
| :------ |
| `S` |

## Hierarchy

- `Omit`<[`RpcPeerOptions`](dxos_rpc.RpcPeerOptions.md), ``"messageHandler"``\>

  ↳ **`RpcBundledServerOptions`**

## Properties

### handlers

 **handlers**: `S`

#### Defined in

[packages/core/mesh/rpc/src/service.ts:173](https://github.com/dxos/dxos/blob/main/packages/core/mesh/rpc/src/service.ts#L173)

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

### services

 **services**: [`ServiceBundle`](../types/dxos_rpc.ServiceBundle.md)<`S`\>

#### Defined in

[packages/core/mesh/rpc/src/service.ts:172](https://github.com/dxos/dxos/blob/main/packages/core/mesh/rpc/src/service.ts#L172)

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

#### Inherited from

Omit.streamHandler

#### Defined in

[packages/core/mesh/rpc/src/rpc.ts:26](https://github.com/dxos/dxos/blob/main/packages/core/mesh/rpc/src/rpc.ts#L26)

___

### timeout

 `Optional` **timeout**: `number`

#### Inherited from

Omit.timeout

#### Defined in

[packages/core/mesh/rpc/src/rpc.ts:28](https://github.com/dxos/dxos/blob/main/packages/core/mesh/rpc/src/rpc.ts#L28)
