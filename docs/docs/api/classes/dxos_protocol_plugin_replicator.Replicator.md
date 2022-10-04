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

[packages/core/mesh/protocol-plugin-replicator/src/replicator.ts:67](https://github.com/dxos/dxos/blob/main/packages/core/mesh/protocol-plugin-replicator/src/replicator.ts#L67)

## Properties

### \_load

 `Private` `Readonly` **\_load**: `LoadFunction`

#### Defined in

[packages/core/mesh/protocol-plugin-replicator/src/replicator.ts:63](https://github.com/dxos/dxos/blob/main/packages/core/mesh/protocol-plugin-replicator/src/replicator.ts#L63)

___

### \_options

 `Private` **\_options**: `Object`

#### Type declaration

| Name | Type |
| :------ | :------ |
| `timeout` | `number` |

#### Defined in

[packages/core/mesh/protocol-plugin-replicator/src/replicator.ts:62](https://github.com/dxos/dxos/blob/main/packages/core/mesh/protocol-plugin-replicator/src/replicator.ts#L62)

___

### \_peers

 `Private` `Readonly` **\_peers**: `Map`<`Protocol`, `Peer`\>

#### Defined in

[packages/core/mesh/protocol-plugin-replicator/src/replicator.ts:61](https://github.com/dxos/dxos/blob/main/packages/core/mesh/protocol-plugin-replicator/src/replicator.ts#L61)

___

### \_replicate

 `Private` `Readonly` **\_replicate**: `ReplicateFunction`

#### Defined in

[packages/core/mesh/protocol-plugin-replicator/src/replicator.ts:65](https://github.com/dxos/dxos/blob/main/packages/core/mesh/protocol-plugin-replicator/src/replicator.ts#L65)

___

### \_subscribe

 `Private` `Readonly` **\_subscribe**: `SubscribeFunction`

#### Defined in

[packages/core/mesh/protocol-plugin-replicator/src/replicator.ts:64](https://github.com/dxos/dxos/blob/main/packages/core/mesh/protocol-plugin-replicator/src/replicator.ts#L64)

___

### extension

 `Static` **extension**: `string` = `'dxos.mesh.protocol.replicator'`

#### Defined in

[packages/core/mesh/protocol-plugin-replicator/src/replicator.ts:60](https://github.com/dxos/dxos/blob/main/packages/core/mesh/protocol-plugin-replicator/src/replicator.ts#L60)

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

[packages/core/mesh/protocol-plugin-replicator/src/replicator.ts:179](https://github.com/dxos/dxos/blob/main/packages/core/mesh/protocol-plugin-replicator/src/replicator.ts#L179)

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

[packages/core/mesh/protocol-plugin-replicator/src/replicator.ts:175](https://github.com/dxos/dxos/blob/main/packages/core/mesh/protocol-plugin-replicator/src/replicator.ts#L175)

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

[packages/core/mesh/protocol-plugin-replicator/src/replicator.ts:108](https://github.com/dxos/dxos/blob/main/packages/core/mesh/protocol-plugin-replicator/src/replicator.ts#L108)

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

[packages/core/mesh/protocol-plugin-replicator/src/replicator.ts:93](https://github.com/dxos/dxos/blob/main/packages/core/mesh/protocol-plugin-replicator/src/replicator.ts#L93)

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

[packages/core/mesh/protocol-plugin-replicator/src/replicator.ts:141](https://github.com/dxos/dxos/blob/main/packages/core/mesh/protocol-plugin-replicator/src/replicator.ts#L141)

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

[packages/core/mesh/protocol-plugin-replicator/src/replicator.ts:160](https://github.com/dxos/dxos/blob/main/packages/core/mesh/protocol-plugin-replicator/src/replicator.ts#L160)

___

### createExtension

**createExtension**(): `Extension`

Creates a protocol extension for key exchange.

#### Returns

`Extension`

#### Defined in

[packages/core/mesh/protocol-plugin-replicator/src/replicator.ts:81](https://github.com/dxos/dxos/blob/main/packages/core/mesh/protocol-plugin-replicator/src/replicator.ts#L81)
