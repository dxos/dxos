# Class: PresencePlugin

[@dxos/protocol-plugin-presence](../modules/dxos_protocol_plugin_presence.md).PresencePlugin

Presence protocol plugin.

## Constructors

### constructor

**new PresencePlugin**(`_peerId`, `options?`)

#### Parameters

| Name | Type |
| :------ | :------ |
| `_peerId` | `Buffer` |
| `options` | [`PresenceOptions`](../interfaces/dxos_protocol_plugin_presence.PresenceOptions.md) |

#### Defined in

[packages/core/mesh/protocol-plugin-presence/src/presence-plugin.ts:87](https://github.com/dxos/dxos/blob/main/packages/core/mesh/protocol-plugin-presence/src/presence-plugin.ts#L87)

## Properties

### \_broadcast

 `Private` **\_broadcast**: `Broadcast`<`Peer`\>

#### Defined in

[packages/core/mesh/protocol-plugin-presence/src/presence-plugin.ts:84](https://github.com/dxos/dxos/blob/main/packages/core/mesh/protocol-plugin-presence/src/presence-plugin.ts#L84)

___

### \_codec

 `Private` `Readonly` **\_codec**: `ProtoCodec`<`Alive`\>

#### Defined in

[packages/core/mesh/protocol-plugin-presence/src/presence-plugin.ts:66](https://github.com/dxos/dxos/blob/main/packages/core/mesh/protocol-plugin-presence/src/presence-plugin.ts#L66)

___

### \_connectionJoined

 `Private` `Readonly` **\_connectionJoined**: `Event`<`ConnectionEventDetails`\>

#### Defined in

[packages/core/mesh/protocol-plugin-presence/src/presence-plugin.ts:73](https://github.com/dxos/dxos/blob/main/packages/core/mesh/protocol-plugin-presence/src/presence-plugin.ts#L73)

___

### \_connectionLeft

 `Private` `Readonly` **\_connectionLeft**: `Event`<`ConnectionEventDetails`\>

#### Defined in

[packages/core/mesh/protocol-plugin-presence/src/presence-plugin.ts:74](https://github.com/dxos/dxos/blob/main/packages/core/mesh/protocol-plugin-presence/src/presence-plugin.ts#L74)

___

### \_error

 `Private` `Readonly` **\_error**: `Event`<`Error`\>

#### Defined in

[packages/core/mesh/protocol-plugin-presence/src/presence-plugin.ts:70](https://github.com/dxos/dxos/blob/main/packages/core/mesh/protocol-plugin-presence/src/presence-plugin.ts#L70)

___

### \_graph

 `Private` **\_graph**: `Graph`<`GraphNode`, `any`\> & `EventedType`

#### Defined in

[packages/core/mesh/protocol-plugin-presence/src/presence-plugin.ts:83](https://github.com/dxos/dxos/blob/main/packages/core/mesh/protocol-plugin-presence/src/presence-plugin.ts#L83)

___

### \_limit

 `Private` `Readonly` **\_limit**: `Limit`

#### Defined in

[packages/core/mesh/protocol-plugin-presence/src/presence-plugin.ts:65](https://github.com/dxos/dxos/blob/main/packages/core/mesh/protocol-plugin-presence/src/presence-plugin.ts#L65)

___

### \_metadata

 `Private` **\_metadata**: `any`

#### Defined in

[packages/core/mesh/protocol-plugin-presence/src/presence-plugin.ts:82](https://github.com/dxos/dxos/blob/main/packages/core/mesh/protocol-plugin-presence/src/presence-plugin.ts#L82)

___

### \_neighborAlreadyConnected

 `Private` `Readonly` **\_neighborAlreadyConnected**: `Event`<`string`\>

#### Defined in

[packages/core/mesh/protocol-plugin-presence/src/presence-plugin.ts:77](https://github.com/dxos/dxos/blob/main/packages/core/mesh/protocol-plugin-presence/src/presence-plugin.ts#L77)

___

### \_neighborJoined

 `Private` `Readonly` **\_neighborJoined**: `Event`<`NeighborJoinedEventDetails`\>

#### Defined in

[packages/core/mesh/protocol-plugin-presence/src/presence-plugin.ts:78](https://github.com/dxos/dxos/blob/main/packages/core/mesh/protocol-plugin-presence/src/presence-plugin.ts#L78)

___

### \_neighborLeft

 `Private` `Readonly` **\_neighborLeft**: `Event`<`string`\>

#### Defined in

[packages/core/mesh/protocol-plugin-presence/src/presence-plugin.ts:79](https://github.com/dxos/dxos/blob/main/packages/core/mesh/protocol-plugin-presence/src/presence-plugin.ts#L79)

___

### \_neighbors

 `Private` `Readonly` **\_neighbors**: `Map`<`string`, `any`\>

#### Defined in

[packages/core/mesh/protocol-plugin-presence/src/presence-plugin.ts:67](https://github.com/dxos/dxos/blob/main/packages/core/mesh/protocol-plugin-presence/src/presence-plugin.ts#L67)

___

### \_peerJoined

 `Private` `Readonly` **\_peerJoined**: `Event`<`Buffer`\>

#### Defined in

[packages/core/mesh/protocol-plugin-presence/src/presence-plugin.ts:71](https://github.com/dxos/dxos/blob/main/packages/core/mesh/protocol-plugin-presence/src/presence-plugin.ts#L71)

___

### \_peerLeft

 `Private` `Readonly` **\_peerLeft**: `Event`<`Buffer`\>

#### Defined in

[packages/core/mesh/protocol-plugin-presence/src/presence-plugin.ts:72](https://github.com/dxos/dxos/blob/main/packages/core/mesh/protocol-plugin-presence/src/presence-plugin.ts#L72)

___

### \_peerTimeout

 `Private` `Readonly` **\_peerTimeout**: `number`

#### Defined in

[packages/core/mesh/protocol-plugin-presence/src/presence-plugin.ts:64](https://github.com/dxos/dxos/blob/main/packages/core/mesh/protocol-plugin-presence/src/presence-plugin.ts#L64)

___

### \_protocolMessage

 `Private` `Readonly` **\_protocolMessage**: `Event`<`ProtocolMessageEventDetails`\>

#### Defined in

[packages/core/mesh/protocol-plugin-presence/src/presence-plugin.ts:75](https://github.com/dxos/dxos/blob/main/packages/core/mesh/protocol-plugin-presence/src/presence-plugin.ts#L75)

___

### \_remotePing

 `Private` `Readonly` **\_remotePing**: `Event`<`Alive`\>

#### Defined in

[packages/core/mesh/protocol-plugin-presence/src/presence-plugin.ts:76](https://github.com/dxos/dxos/blob/main/packages/core/mesh/protocol-plugin-presence/src/presence-plugin.ts#L76)

___

### \_scheduler

 `Private` **\_scheduler**: ``null`` \| `Timeout` = `null`

#### Defined in

[packages/core/mesh/protocol-plugin-presence/src/presence-plugin.ts:85](https://github.com/dxos/dxos/blob/main/packages/core/mesh/protocol-plugin-presence/src/presence-plugin.ts#L85)

___

### extensionsCreated

 `Private` **extensionsCreated**: `number` = `0`

#### Defined in

[packages/core/mesh/protocol-plugin-presence/src/presence-plugin.ts:63](https://github.com/dxos/dxos/blob/main/packages/core/mesh/protocol-plugin-presence/src/presence-plugin.ts#L63)

___

### graphUpdated

 `Readonly` **graphUpdated**: `Event`<`GraphUpdatedEventDetails`\>

#### Defined in

[packages/core/mesh/protocol-plugin-presence/src/presence-plugin.ts:80](https://github.com/dxos/dxos/blob/main/packages/core/mesh/protocol-plugin-presence/src/presence-plugin.ts#L80)

___

### EXTENSION\_NAME

 `Static` **EXTENSION\_NAME**: `string` = `'dxos.mesh.protocol.presence'`

#### Defined in

[packages/core/mesh/protocol-plugin-presence/src/presence-plugin.ts:61](https://github.com/dxos/dxos/blob/main/packages/core/mesh/protocol-plugin-presence/src/presence-plugin.ts#L61)

## Accessors

### graph

`get` **graph**(): `Graph`<`GraphNode`, `any`\> & `EventedType`

#### Returns

`Graph`<`GraphNode`, `any`\> & `EventedType`

#### Defined in

[packages/core/mesh/protocol-plugin-presence/src/presence-plugin.ts:118](https://github.com/dxos/dxos/blob/main/packages/core/mesh/protocol-plugin-presence/src/presence-plugin.ts#L118)

___

### metadata

`get` **metadata**(): `any`

#### Returns

`any`

#### Defined in

[packages/core/mesh/protocol-plugin-presence/src/presence-plugin.ts:122](https://github.com/dxos/dxos/blob/main/packages/core/mesh/protocol-plugin-presence/src/presence-plugin.ts#L122)

___

### peerId

`get` **peerId**(): `Buffer`

#### Returns

`Buffer`

#### Defined in

[packages/core/mesh/protocol-plugin-presence/src/presence-plugin.ts:105](https://github.com/dxos/dxos/blob/main/packages/core/mesh/protocol-plugin-presence/src/presence-plugin.ts#L105)

___

### peers

`get` **peers**(): `Buffer`[]

#### Returns

`Buffer`[]

#### Defined in

[packages/core/mesh/protocol-plugin-presence/src/presence-plugin.ts:109](https://github.com/dxos/dxos/blob/main/packages/core/mesh/protocol-plugin-presence/src/presence-plugin.ts#L109)

## Methods

### \_addPeer

`Private` **_addPeer**(`protocol`): `void`

#### Parameters

| Name | Type |
| :------ | :------ |
| `protocol` | `Protocol` |

#### Returns

`void`

#### Defined in

[packages/core/mesh/protocol-plugin-presence/src/presence-plugin.ts:304](https://github.com/dxos/dxos/blob/main/packages/core/mesh/protocol-plugin-presence/src/presence-plugin.ts#L304)

___

### \_buildBroadcast

`Private` **_buildBroadcast**(): `void`

#### Returns

`void`

#### Defined in

[packages/core/mesh/protocol-plugin-presence/src/presence-plugin.ts:229](https://github.com/dxos/dxos/blob/main/packages/core/mesh/protocol-plugin-presence/src/presence-plugin.ts#L229)

___

### \_buildGraph

`Private` **_buildGraph**(): `void`

#### Returns

`void`

#### Defined in

[packages/core/mesh/protocol-plugin-presence/src/presence-plugin.ts:184](https://github.com/dxos/dxos/blob/main/packages/core/mesh/protocol-plugin-presence/src/presence-plugin.ts#L184)

___

### \_deleteNode

`Private` **_deleteNode**(`id`): `void`

#### Parameters

| Name | Type |
| :------ | :------ |
| `id` | `string` |

#### Returns

`void`

#### Defined in

[packages/core/mesh/protocol-plugin-presence/src/presence-plugin.ts:396](https://github.com/dxos/dxos/blob/main/packages/core/mesh/protocol-plugin-presence/src/presence-plugin.ts#L396)

___

### \_deleteNodeIfEmpty

`Private` **_deleteNodeIfEmpty**(`id`): `void`

#### Parameters

| Name | Type |
| :------ | :------ |
| `id` | `string` |

#### Returns

`void`

#### Defined in

[packages/core/mesh/protocol-plugin-presence/src/presence-plugin.ts:403](https://github.com/dxos/dxos/blob/main/packages/core/mesh/protocol-plugin-presence/src/presence-plugin.ts#L403)

___

### \_peerMessageHandler

`Private` **_peerMessageHandler**(`protocol`, `chunk`): `void`

#### Parameters

| Name | Type |
| :------ | :------ |
| `protocol` | `Protocol` |
| `chunk` | `any` |

#### Returns

`void`

#### Defined in

[packages/core/mesh/protocol-plugin-presence/src/presence-plugin.ts:278](https://github.com/dxos/dxos/blob/main/packages/core/mesh/protocol-plugin-presence/src/presence-plugin.ts#L278)

___

### \_pingLimit

`Private` **_pingLimit**(): `void`

NOTICE: Does not return a Promise cause it could hang if the queue is cleared.

#### Returns

`void`

#### Defined in

[packages/core/mesh/protocol-plugin-presence/src/presence-plugin.ts:152](https://github.com/dxos/dxos/blob/main/packages/core/mesh/protocol-plugin-presence/src/presence-plugin.ts#L152)

___

### \_pruneGraph

`Private` **_pruneGraph**(): `void`

#### Returns

`void`

#### Defined in

[packages/core/mesh/protocol-plugin-presence/src/presence-plugin.ts:285](https://github.com/dxos/dxos/blob/main/packages/core/mesh/protocol-plugin-presence/src/presence-plugin.ts#L285)

___

### \_removePeer

`Private` **_removePeer**(`protocol`): `Promise`<`void`\>

Remove peer.

#### Parameters

| Name | Type |
| :------ | :------ |
| `protocol` | `Protocol` |

#### Returns

`Promise`<`void`\>

#### Defined in

[packages/core/mesh/protocol-plugin-presence/src/presence-plugin.ts:330](https://github.com/dxos/dxos/blob/main/packages/core/mesh/protocol-plugin-presence/src/presence-plugin.ts#L330)

___

### \_updateGraph

`Private` **_updateGraph**(`__namedParameters`): `void`

#### Parameters

| Name | Type |
| :------ | :------ |
| `__namedParameters` | `any` |

#### Returns

`void`

#### Defined in

[packages/core/mesh/protocol-plugin-presence/src/presence-plugin.ts:358](https://github.com/dxos/dxos/blob/main/packages/core/mesh/protocol-plugin-presence/src/presence-plugin.ts#L358)

___

### createExtension

**createExtension**(): `Extension`

Create protocol extension.

#### Returns

`Extension`

#### Defined in

[packages/core/mesh/protocol-plugin-presence/src/presence-plugin.ts:133](https://github.com/dxos/dxos/blob/main/packages/core/mesh/protocol-plugin-presence/src/presence-plugin.ts#L133)

___

### ping

**ping**(): `Promise`<`void`\>

#### Returns

`Promise`<`void`\>

#### Defined in

[packages/core/mesh/protocol-plugin-presence/src/presence-plugin.ts:410](https://github.com/dxos/dxos/blob/main/packages/core/mesh/protocol-plugin-presence/src/presence-plugin.ts#L410)

___

### setMetadata

**setMetadata**(`metadata`): `void`

#### Parameters

| Name | Type |
| :------ | :------ |
| `metadata` | `any` |

#### Returns

`void`

#### Defined in

[packages/core/mesh/protocol-plugin-presence/src/presence-plugin.ts:126](https://github.com/dxos/dxos/blob/main/packages/core/mesh/protocol-plugin-presence/src/presence-plugin.ts#L126)

___

### start

**start**(): `void`

#### Returns

`void`

#### Defined in

[packages/core/mesh/protocol-plugin-presence/src/presence-plugin.ts:156](https://github.com/dxos/dxos/blob/main/packages/core/mesh/protocol-plugin-presence/src/presence-plugin.ts#L156)

___

### stop

**stop**(): `void`

#### Returns

`void`

#### Defined in

[packages/core/mesh/protocol-plugin-presence/src/presence-plugin.ts:173](https://github.com/dxos/dxos/blob/main/packages/core/mesh/protocol-plugin-presence/src/presence-plugin.ts#L173)
