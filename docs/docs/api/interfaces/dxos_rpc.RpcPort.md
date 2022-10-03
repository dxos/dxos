# Interface: RpcPort

[@dxos/rpc](../modules/dxos_rpc.md).RpcPort

Interface for a transport-agnostic port to send/receive binary messages.

## Properties

### send

 **send**: (`msg`: `Uint8Array`) => `MaybePromise`<`void`\>

#### Type declaration

(`msg`): `MaybePromise`<`void`\>

##### Parameters

| Name | Type |
| :------ | :------ |
| `msg` | `Uint8Array` |

##### Returns

`MaybePromise`<`void`\>

#### Defined in

[packages/core/mesh/rpc/src/rpc.ts:39](https://github.com/dxos/dxos/blob/main/packages/core/mesh/rpc/src/rpc.ts#L39)

___

### subscribe

 **subscribe**: (`cb`: (`msg`: `Uint8Array`) => `void`) => `void` \| () => `void`

#### Type declaration

(`cb`): `void` \| () => `void`

##### Parameters

| Name | Type |
| :------ | :------ |
| `cb` | (`msg`: `Uint8Array`) => `void` |

##### Returns

`void` \| () => `void`

#### Defined in

[packages/core/mesh/rpc/src/rpc.ts:40](https://github.com/dxos/dxos/blob/main/packages/core/mesh/rpc/src/rpc.ts#L40)
