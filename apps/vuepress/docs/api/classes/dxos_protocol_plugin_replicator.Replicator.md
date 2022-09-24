# Class: Replicator

[@dxos/protocol-plugin-replicator](../modules/dxos_protocol_plugin_replicator.md).Replicator

Manages key exchange and feed replication.

## Table of contents

### Constructors

- [constructor](dxos_protocol_plugin_replicator.Replicator.md#constructor)

### Properties

- [\_load](dxos_protocol_plugin_replicator.Replicator.md#_load)
- [\_options](dxos_protocol_plugin_replicator.Replicator.md#_options)
- [\_peers](dxos_protocol_plugin_replicator.Replicator.md#_peers)
- [\_replicate](dxos_protocol_plugin_replicator.Replicator.md#_replicate)
- [\_subscribe](dxos_protocol_plugin_replicator.Replicator.md#_subscribe)
- [extension](dxos_protocol_plugin_replicator.Replicator.md#extension)

### Methods

- [\_closeHandler](dxos_protocol_plugin_replicator.Replicator.md#_closehandler)
- [\_feedHandler](dxos_protocol_plugin_replicator.Replicator.md#_feedhandler)
- [\_handshakeHandler](dxos_protocol_plugin_replicator.Replicator.md#_handshakehandler)
- [\_initHandler](dxos_protocol_plugin_replicator.Replicator.md#_inithandler)
- [\_messageHandler](dxos_protocol_plugin_replicator.Replicator.md#_messagehandler)
- [\_replicateHandler](dxos_protocol_plugin_replicator.Replicator.md#_replicatehandler)
- [createExtension](dxos_protocol_plugin_replicator.Replicator.md#createextension)

## Constructors

### constructor

• **new Replicator**(`middleware`, `options?`)

#### Parameters

| Name | Type |
| :------ | :------ |
| `middleware` | [`ReplicatorMiddleware`](../interfaces/dxos_protocol_plugin_replicator.ReplicatorMiddleware.md) |
| `options?` | `Object` |
| `options.timeout` | `number` |

#### Defined in

[packages/mesh/protocol-plugin-replicator/src/replicator.ts:66](https://github.com/dxos/dxos/blob/e3b936721/packages/mesh/protocol-plugin-replicator/src/replicator.ts#L66)

## Properties

### \_load

• `Private` **\_load**: `LoadFunction`

#### Defined in

[packages/mesh/protocol-plugin-replicator/src/replicator.ts:62](https://github.com/dxos/dxos/blob/e3b936721/packages/mesh/protocol-plugin-replicator/src/replicator.ts#L62)

___

### \_options

• `Private` **\_options**: `Object`

#### Type declaration

| Name | Type |
| :------ | :------ |
| `timeout` | `number` |

#### Defined in

[packages/mesh/protocol-plugin-replicator/src/replicator.ts:61](https://github.com/dxos/dxos/blob/e3b936721/packages/mesh/protocol-plugin-replicator/src/replicator.ts#L61)

___

### \_peers

• `Private` `Readonly` **\_peers**: `Map`<`Protocol`, `Peer`\>

#### Defined in

[packages/mesh/protocol-plugin-replicator/src/replicator.ts:60](https://github.com/dxos/dxos/blob/e3b936721/packages/mesh/protocol-plugin-replicator/src/replicator.ts#L60)

___

### \_replicate

• `Private` **\_replicate**: `ReplicateFunction`

#### Defined in

[packages/mesh/protocol-plugin-replicator/src/replicator.ts:64](https://github.com/dxos/dxos/blob/e3b936721/packages/mesh/protocol-plugin-replicator/src/replicator.ts#L64)

___

### \_subscribe

• `Private` **\_subscribe**: `SubscribeFunction`

#### Defined in

[packages/mesh/protocol-plugin-replicator/src/replicator.ts:63](https://github.com/dxos/dxos/blob/e3b936721/packages/mesh/protocol-plugin-replicator/src/replicator.ts#L63)

___

### extension

▪ `Static` **extension**: `string` = `'dxos.mesh.protocol.replicator'`

#### Defined in

[packages/mesh/protocol-plugin-replicator/src/replicator.ts:59](https://github.com/dxos/dxos/blob/e3b936721/packages/mesh/protocol-plugin-replicator/src/replicator.ts#L59)

## Methods

### \_closeHandler

▸ **_closeHandler**(`protocol`): `void`

#### Parameters

| Name | Type |
| :------ | :------ |
| `protocol` | `Protocol` |

#### Returns

`void`

#### Defined in

[packages/mesh/protocol-plugin-replicator/src/replicator.ts:178](https://github.com/dxos/dxos/blob/e3b936721/packages/mesh/protocol-plugin-replicator/src/replicator.ts#L178)

___

### \_feedHandler

▸ **_feedHandler**(`protocol`, `discoveryKey`): `Promise`<`void`\>

#### Parameters

| Name | Type |
| :------ | :------ |
| `protocol` | `Protocol` |
| `discoveryKey` | `PublicKeyLike` |

#### Returns

`Promise`<`void`\>

#### Defined in

[packages/mesh/protocol-plugin-replicator/src/replicator.ts:174](https://github.com/dxos/dxos/blob/e3b936721/packages/mesh/protocol-plugin-replicator/src/replicator.ts#L174)

___

### \_handshakeHandler

▸ **_handshakeHandler**(`protocol`): `Promise`<`void`\>

Start replicating topics.

#### Parameters

| Name | Type |
| :------ | :------ |
| `protocol` | `Protocol` |

#### Returns

`Promise`<`void`\>

#### Defined in

[packages/mesh/protocol-plugin-replicator/src/replicator.ts:107](https://github.com/dxos/dxos/blob/e3b936721/packages/mesh/protocol-plugin-replicator/src/replicator.ts#L107)

___

### \_initHandler

▸ **_initHandler**(`protocol`): `Promise`<`void`\>

#### Parameters

| Name | Type |
| :------ | :------ |
| `protocol` | `Protocol` |

#### Returns

`Promise`<`void`\>

#### Defined in

[packages/mesh/protocol-plugin-replicator/src/replicator.ts:92](https://github.com/dxos/dxos/blob/e3b936721/packages/mesh/protocol-plugin-replicator/src/replicator.ts#L92)

___

### \_messageHandler

▸ **_messageHandler**(`protocol`, `message`): `Promise`<`void`\>

Handles key exchange requests.

#### Parameters

| Name | Type |
| :------ | :------ |
| `protocol` | `Protocol` |
| `message` | `any` |

#### Returns

`Promise`<`void`\>

#### Defined in

[packages/mesh/protocol-plugin-replicator/src/replicator.ts:140](https://github.com/dxos/dxos/blob/e3b936721/packages/mesh/protocol-plugin-replicator/src/replicator.ts#L140)

___

### \_replicateHandler

▸ **_replicateHandler**(`protocol`, `data`): `Promise`<`void`\>

#### Parameters

| Name | Type |
| :------ | :------ |
| `protocol` | `Protocol` |
| `data` | `any` |

#### Returns

`Promise`<`void`\>

#### Defined in

[packages/mesh/protocol-plugin-replicator/src/replicator.ts:159](https://github.com/dxos/dxos/blob/e3b936721/packages/mesh/protocol-plugin-replicator/src/replicator.ts#L159)

___

### createExtension

▸ **createExtension**(): `Extension`

Creates a protocol extension for key exchange.

#### Returns

`Extension`

#### Defined in

[packages/mesh/protocol-plugin-replicator/src/replicator.ts:80](https://github.com/dxos/dxos/blob/e3b936721/packages/mesh/protocol-plugin-replicator/src/replicator.ts#L80)
