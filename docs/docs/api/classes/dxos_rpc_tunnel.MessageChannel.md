# Class: MessageChannel

[@dxos/rpc-tunnel](../modules/dxos_rpc_tunnel.md).MessageChannel

Facilitates the multiplexing of multiple RpcPorts over a single MessagePort.

## Constructors

### constructor

**new MessageChannel**(`_setup`)

#### Parameters

| Name | Type |
| :------ | :------ |
| `_setup` | (`channel`: [`MessageChannel`](dxos_rpc_tunnel.MessageChannel.md), `port`: `MessagePort`) => `Promise`<`void`\> |

#### Defined in

[packages/core/mesh/rpc-tunnel/src/ports/worker.ts:74](https://github.com/dxos/dxos/blob/main/packages/core/mesh/rpc-tunnel/src/ports/worker.ts#L74)

## Properties

### \_handlers

 `Private` `Readonly` **\_handlers**: `Map`<`string`, { `handler`: (`data`: [`MessageData`](../types/dxos_rpc_tunnel.MessageData.md)) => `void` ; `source`: `string` \| `RegExp`  }\>

#### Defined in

[packages/core/mesh/rpc-tunnel/src/ports/worker.ts:69](https://github.com/dxos/dxos/blob/main/packages/core/mesh/rpc-tunnel/src/ports/worker.ts#L69)

___

### \_nextId

 `Private` **\_nextId**: `number` = `1`

#### Defined in

[packages/core/mesh/rpc-tunnel/src/ports/worker.ts:67](https://github.com/dxos/dxos/blob/main/packages/core/mesh/rpc-tunnel/src/ports/worker.ts#L67)

___

### messagePorts

 `Private` `Readonly` **messagePorts**: `Map`<`number`, `MessagePort`\>

#### Defined in

[packages/core/mesh/rpc-tunnel/src/ports/worker.ts:68](https://github.com/dxos/dxos/blob/main/packages/core/mesh/rpc-tunnel/src/ports/worker.ts#L68)

## Methods

### addHandler

**addHandler**(`id`, `source`, `handler`): `void`

#### Parameters

| Name | Type |
| :------ | :------ |
| `id` | `string` |
| `source` | `string` \| `RegExp` |
| `handler` | (`data`: [`MessageData`](../types/dxos_rpc_tunnel.MessageData.md)) => `void` |

#### Returns

`void`

#### Defined in

[packages/core/mesh/rpc-tunnel/src/ports/worker.ts:107](https://github.com/dxos/dxos/blob/main/packages/core/mesh/rpc-tunnel/src/ports/worker.ts#L107)

___

### addPort

**addPort**(`port`): `Promise`<`void`\>

#### Parameters

| Name | Type |
| :------ | :------ |
| `port` | `MessagePort` |

#### Returns

`Promise`<`void`\>

#### Defined in

[packages/core/mesh/rpc-tunnel/src/ports/worker.ts:100](https://github.com/dxos/dxos/blob/main/packages/core/mesh/rpc-tunnel/src/ports/worker.ts#L100)

___

### onConnect

**onConnect**(`event`): `Promise`<`void`\>

#### Parameters

| Name | Type |
| :------ | :------ |
| `event` | `MessageEvent`<`any`\> |

#### Returns

`Promise`<`void`\>

#### Defined in

[packages/core/mesh/rpc-tunnel/src/ports/worker.ts:76](https://github.com/dxos/dxos/blob/main/packages/core/mesh/rpc-tunnel/src/ports/worker.ts#L76)

___

### onMessage

**onMessage**(`event`): `void`

#### Parameters

| Name | Type |
| :------ | :------ |
| `event` | `MessageEvent`<[`MessageData`](../types/dxos_rpc_tunnel.MessageData.md)\> |

#### Returns

`void`

#### Defined in

[packages/core/mesh/rpc-tunnel/src/ports/worker.ts:80](https://github.com/dxos/dxos/blob/main/packages/core/mesh/rpc-tunnel/src/ports/worker.ts#L80)

___

### removeHandler

**removeHandler**(`id`): `void`

#### Parameters

| Name | Type |
| :------ | :------ |
| `id` | `string` |

#### Returns

`void`

#### Defined in

[packages/core/mesh/rpc-tunnel/src/ports/worker.ts:111](https://github.com/dxos/dxos/blob/main/packages/core/mesh/rpc-tunnel/src/ports/worker.ts#L111)
