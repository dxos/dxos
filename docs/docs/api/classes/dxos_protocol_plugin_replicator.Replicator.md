# Class: Replicator

[@dxos/protocol-plugin-replicator](../modules/dxos_protocol_plugin_replicator.md).Replicator

Manages key exchange and feed replication.

## Constructors

### constructor

**new Replicator**(`middleware`, `options?`)

#### Parameters

| Name | Type |
| :------ | :------ |
| `middleware` | [`ReplicatorMiddleware`](../interfaces/dxos_protocol_plugin_replicator.ReplicatorMiddleware.md) |
| `options?` | `Object` |
| `options.timeout` | `number` |

#### Defined in

[packages/mesh/protocol-plugin-replicator/src/replicator.ts:66](https://github.com/dxos/dxos/blob/main/packages/mesh/protocol-plugin-replicator/src/replicator.ts#L66)

## Properties

### \_load

 `Private` **\_load**: `LoadFunction`

#### Defined in

[packages/mesh/protocol-plugin-replicator/src/replicator.ts:62](https://github.com/dxos/dxos/blob/main/packages/mesh/protocol-plugin-replicator/src/replicator.ts#L62)

___

### \_options

 `Private` **\_options**: `Object`

#### Type declaration

| Name | Type |
| :------ | :------ |
| `timeout` | `number` |

#### Defined in

[packages/mesh/protocol-plugin-replicator/src/replicator.ts:61](https://github.com/dxos/dxos/blob/main/packages/mesh/protocol-plugin-replicator/src/replicator.ts#L61)

___

### \_peers

 `Private` `Readonly` **\_peers**: `Map`<`Protocol`, `Peer`\>

#### Defined in

[packages/mesh/protocol-plugin-replicator/src/replicator.ts:60](https://github.com/dxos/dxos/blob/main/packages/mesh/protocol-plugin-replicator/src/replicator.ts#L60)

___

### \_replicate

 `Private` **\_replicate**: `ReplicateFunction`

#### Defined in

[packages/mesh/protocol-plugin-replicator/src/replicator.ts:64](https://github.com/dxos/dxos/blob/main/packages/mesh/protocol-plugin-replicator/src/replicator.ts#L64)

___

### \_subscribe

 `Private` **\_subscribe**: `SubscribeFunction`

#### Defined in

[packages/mesh/protocol-plugin-replicator/src/replicator.ts:63](https://github.com/dxos/dxos/blob/main/packages/mesh/protocol-plugin-replicator/src/replicator.ts#L63)

___

### extension

 `Static` **extension**: `string` = `'dxos.mesh.protocol.replicator'`

#### Defined in

[packages/mesh/protocol-plugin-replicator/src/replicator.ts:59](https://github.com/dxos/dxos/blob/main/packages/mesh/protocol-plugin-replicator/src/replicator.ts#L59)

## Methods

### \_closeHandler

**_closeHandler**(`protocol`): `void`

#### Parameters

| Name | Type |
| :------ | :------ |
| `protocol` | `Protocol` |

#### Returns

`void`

#### Defined in

[packages/mesh/protocol-plugin-replicator/src/replicator.ts:178](https://github.com/dxos/dxos/blob/main/packages/mesh/protocol-plugin-replicator/src/replicator.ts#L178)

___

### \_feedHandler

**_feedHandler**(`protocol`, `discoveryKey`): `Promise`<`void`\>

#### Parameters

| Name | Type |
| :------ | :------ |
| `protocol` | `Protocol` |
| `discoveryKey` | `PublicKeyLike` |

#### Returns

`Promise`<`void`\>

#### Defined in

[packages/mesh/protocol-plugin-replicator/src/replicator.ts:174](https://github.com/dxos/dxos/blob/main/packages/mesh/protocol-plugin-replicator/src/replicator.ts#L174)

___

### \_handshakeHandler

**_handshakeHandler**(`protocol`): `Promise`<`void`\>

Start replicating topics.

#### Parameters

| Name | Type |
| :------ | :------ |
| `protocol` | `Protocol` |

#### Returns

`Promise`<`void`\>

#### Defined in

[packages/mesh/protocol-plugin-replicator/src/replicator.ts:107](https://github.com/dxos/dxos/blob/main/packages/mesh/protocol-plugin-replicator/src/replicator.ts#L107)

___

### \_initHandler

**_initHandler**(`protocol`): `Promise`<`void`\>

#### Parameters

| Name | Type |
| :------ | :------ |
| `protocol` | `Protocol` |

#### Returns

`Promise`<`void`\>

#### Defined in

[packages/mesh/protocol-plugin-replicator/src/replicator.ts:92](https://github.com/dxos/dxos/blob/main/packages/mesh/protocol-plugin-replicator/src/replicator.ts#L92)

___

### \_messageHandler

**_messageHandler**(`protocol`, `message`): `Promise`<`void`\>

Handles key exchange requests.

#### Parameters

| Name | Type |
| :------ | :------ |
| `protocol` | `Protocol` |
| `message` | `any` |

#### Returns

`Promise`<`void`\>

#### Defined in

[packages/mesh/protocol-plugin-replicator/src/replicator.ts:140](https://github.com/dxos/dxos/blob/main/packages/mesh/protocol-plugin-replicator/src/replicator.ts#L140)

___

### \_replicateHandler

**_replicateHandler**(`protocol`, `data`): `Promise`<`void`\>

#### Parameters

| Name | Type |
| :------ | :------ |
| `protocol` | `Protocol` |
| `data` | `any` |

#### Returns

`Promise`<`void`\>

#### Defined in

[packages/mesh/protocol-plugin-replicator/src/replicator.ts:159](https://github.com/dxos/dxos/blob/main/packages/mesh/protocol-plugin-replicator/src/replicator.ts#L159)

___

### createExtension

**createExtension**(): `Extension`

Creates a protocol extension for key exchange.

#### Returns

`Extension`

#### Defined in

[packages/mesh/protocol-plugin-replicator/src/replicator.ts:80](https://github.com/dxos/dxos/blob/main/packages/mesh/protocol-plugin-replicator/src/replicator.ts#L80)
