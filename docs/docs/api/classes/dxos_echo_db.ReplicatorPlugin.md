# Class: ReplicatorPlugin

[@dxos/echo-db](../modules/dxos_echo_db.md).ReplicatorPlugin

Protocol plugin for feed replication.

## Hierarchy

- `Replicator`

  ↳ **`ReplicatorPlugin`**

## Constructors

### constructor

**new ReplicatorPlugin**()

#### Overrides

Replicator.constructor

#### Defined in

[packages/core/echo/echo-db/src/packlets/space/replicator-plugin.ts:24](https://github.com/dxos/dxos/blob/main/packages/core/echo/echo-db/src/packlets/space/replicator-plugin.ts#L24)

## Properties

### \_feedAdded

 `Private` `Readonly` **\_feedAdded**: `Event`<`FeedDescriptor`\>

#### Defined in

[packages/core/echo/echo-db/src/packlets/space/replicator-plugin.ts:14](https://github.com/dxos/dxos/blob/main/packages/core/echo/echo-db/src/packlets/space/replicator-plugin.ts#L14)

___

### \_feeds

 `Private` `Readonly` **\_feeds**: `Set`<`FeedDescriptor`\>

#### Defined in

[packages/core/echo/echo-db/src/packlets/space/replicator-plugin.ts:15](https://github.com/dxos/dxos/blob/main/packages/core/echo/echo-db/src/packlets/space/replicator-plugin.ts#L15)

___

### extension

 `Static` **extension**: `string`

#### Inherited from

Replicator.extension

#### Defined in

packages/core/mesh/protocol-plugin-replicator/dist/src/replicator.d.ts:36

## Methods

### \_closeHandler

**_closeHandler**(`protocol`): `void`

#### Parameters

| Name | Type |
| :------ | :------ |
| `protocol` | `Protocol` |

#### Returns

`void`

#### Inherited from

Replicator.\_closeHandler

#### Defined in

packages/core/mesh/protocol-plugin-replicator/dist/src/replicator.d.ts:65

___

### \_feedHandler

**_feedHandler**(`protocol`, `discovery_key`): `Promise`<`void`\>

#### Parameters

| Name | Type |
| :------ | :------ |
| `protocol` | `Protocol` |
| `discovery_key` | `PublicKeyLike` |

#### Returns

`Promise`<`void`\>

#### Inherited from

Replicator.\_feedHandler

#### Defined in

packages/core/mesh/protocol-plugin-replicator/dist/src/replicator.d.ts:64

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

#### Inherited from

Replicator.\_handshakeHandler

#### Defined in

packages/core/mesh/protocol-plugin-replicator/dist/src/replicator.d.ts:57

___

### \_initHandler

**_initHandler**(`protocol`): `Promise`<`void`\>

#### Parameters

| Name | Type |
| :------ | :------ |
| `protocol` | `Protocol` |

#### Returns

`Promise`<`void`\>

#### Inherited from

Replicator.\_initHandler

#### Defined in

packages/core/mesh/protocol-plugin-replicator/dist/src/replicator.d.ts:50

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

#### Inherited from

Replicator.\_messageHandler

#### Defined in

packages/core/mesh/protocol-plugin-replicator/dist/src/replicator.d.ts:62

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

#### Inherited from

Replicator.\_replicateHandler

#### Defined in

packages/core/mesh/protocol-plugin-replicator/dist/src/replicator.d.ts:63

___

### addFeed

**addFeed**(`feed`): `void`

#### Parameters

| Name | Type |
| :------ | :------ |
| `feed` | `FeedDescriptor` |

#### Returns

`void`

#### Defined in

[packages/core/echo/echo-db/src/packlets/space/replicator-plugin.ts:17](https://github.com/dxos/dxos/blob/main/packages/core/echo/echo-db/src/packlets/space/replicator-plugin.ts#L17)

___

### createExtension

**createExtension**(): `Extension`

Creates a protocol extension for key exchange.

#### Returns

`Extension`

#### Inherited from

Replicator.createExtension

#### Defined in

packages/core/mesh/protocol-plugin-replicator/dist/src/replicator.d.ts:49
