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

[packages/mesh/protocol-plugin-presence/src/presence-plugin.ts:84](https://github.com/dxos/dxos/blob/db8188dae/packages/mesh/protocol-plugin-presence/src/presence-plugin.ts#L84)

## Properties

### \_broadcast

 `Private` **\_broadcast**: `Broadcast`<`Peer`\>

#### Defined in

[packages/mesh/protocol-plugin-presence/src/presence-plugin.ts:81](https://github.com/dxos/dxos/blob/db8188dae/packages/mesh/protocol-plugin-presence/src/presence-plugin.ts#L81)

___

### \_codec

 `Private` `Readonly` **\_codec**: `ProtoCodec`<`Alive`\>

#### Defined in

[packages/mesh/protocol-plugin-presence/src/presence-plugin.ts:65](https://github.com/dxos/dxos/blob/db8188dae/packages/mesh/protocol-plugin-presence/src/presence-plugin.ts#L65)

___

### \_connectionJoined

 `Private` `Readonly` **\_connectionJoined**: `Event`<`ConnectionEventDetails`\>

#### Defined in

[packages/mesh/protocol-plugin-presence/src/presence-plugin.ts:70](https://github.com/dxos/dxos/blob/db8188dae/packages/mesh/protocol-plugin-presence/src/presence-plugin.ts#L70)

___

### \_connectionLeft

 `Private` `Readonly` **\_connectionLeft**: `Event`<`ConnectionEventDetails`\>

#### Defined in

[packages/mesh/protocol-plugin-presence/src/presence-plugin.ts:71](https://github.com/dxos/dxos/blob/db8188dae/packages/mesh/protocol-plugin-presence/src/presence-plugin.ts#L71)

___

### \_error

 `Private` `Readonly` **\_error**: `Event`<`Error`\>

#### Defined in

[packages/mesh/protocol-plugin-presence/src/presence-plugin.ts:67](https://github.com/dxos/dxos/blob/db8188dae/packages/mesh/protocol-plugin-presence/src/presence-plugin.ts#L67)

___

### \_graph

 `Private` **\_graph**: `Graph`<`GraphNode`, `any`\> & `EventedType`

#### Defined in

[packages/mesh/protocol-plugin-presence/src/presence-plugin.ts:80](https://github.com/dxos/dxos/blob/db8188dae/packages/mesh/protocol-plugin-presence/src/presence-plugin.ts#L80)

___

### \_limit

 `Private` `Readonly` **\_limit**: `Limit`

#### Defined in

[packages/mesh/protocol-plugin-presence/src/presence-plugin.ts:64](https://github.com/dxos/dxos/blob/db8188dae/packages/mesh/protocol-plugin-presence/src/presence-plugin.ts#L64)

___

### \_metadata

 `Private` **\_metadata**: `any`

#### Defined in

[packages/mesh/protocol-plugin-presence/src/presence-plugin.ts:79](https://github.com/dxos/dxos/blob/db8188dae/packages/mesh/protocol-plugin-presence/src/presence-plugin.ts#L79)

___

### \_neighborAlreadyConnected

 `Private` `Readonly` **\_neighborAlreadyConnected**: `Event`<`string`\>

#### Defined in

[packages/mesh/protocol-plugin-presence/src/presence-plugin.ts:74](https://github.com/dxos/dxos/blob/db8188dae/packages/mesh/protocol-plugin-presence/src/presence-plugin.ts#L74)

___

### \_neighborJoined

 `Private` `Readonly` **\_neighborJoined**: `Event`<`NeighborJoinedEventDetails`\>

#### Defined in

[packages/mesh/protocol-plugin-presence/src/presence-plugin.ts:75](https://github.com/dxos/dxos/blob/db8188dae/packages/mesh/protocol-plugin-presence/src/presence-plugin.ts#L75)

___

### \_neighborLeft

 `Private` `Readonly` **\_neighborLeft**: `Event`<`string`\>

#### Defined in

[packages/mesh/protocol-plugin-presence/src/presence-plugin.ts:76](https://github.com/dxos/dxos/blob/db8188dae/packages/mesh/protocol-plugin-presence/src/presence-plugin.ts#L76)

___

### \_neighbors

 `Private` `Readonly` **\_neighbors**: `Map`<`string`, `any`\>

#### Defined in

[packages/mesh/protocol-plugin-presence/src/presence-plugin.ts:66](https://github.com/dxos/dxos/blob/db8188dae/packages/mesh/protocol-plugin-presence/src/presence-plugin.ts#L66)

___

### \_peerJoined

 `Private` `Readonly` **\_peerJoined**: `Event`<`Buffer`\>

#### Defined in

[packages/mesh/protocol-plugin-presence/src/presence-plugin.ts:68](https://github.com/dxos/dxos/blob/db8188dae/packages/mesh/protocol-plugin-presence/src/presence-plugin.ts#L68)

___

### \_peerLeft

 `Private` `Readonly` **\_peerLeft**: `Event`<`Buffer`\>

#### Defined in

[packages/mesh/protocol-plugin-presence/src/presence-plugin.ts:69](https://github.com/dxos/dxos/blob/db8188dae/packages/mesh/protocol-plugin-presence/src/presence-plugin.ts#L69)

___

### \_peerTimeout

 `Private` `Readonly` **\_peerTimeout**: `number`

#### Defined in

[packages/mesh/protocol-plugin-presence/src/presence-plugin.ts:63](https://github.com/dxos/dxos/blob/db8188dae/packages/mesh/protocol-plugin-presence/src/presence-plugin.ts#L63)

___

### \_protocolMessage

 `Private` `Readonly` **\_protocolMessage**: `Event`<`ProtocolMessageEventDetails`\>

#### Defined in

[packages/mesh/protocol-plugin-presence/src/presence-plugin.ts:72](https://github.com/dxos/dxos/blob/db8188dae/packages/mesh/protocol-plugin-presence/src/presence-plugin.ts#L72)

___

### \_remotePing

 `Private` `Readonly` **\_remotePing**: `Event`<`Alive`\>

#### Defined in

[packages/mesh/protocol-plugin-presence/src/presence-plugin.ts:73](https://github.com/dxos/dxos/blob/db8188dae/packages/mesh/protocol-plugin-presence/src/presence-plugin.ts#L73)

___

### \_scheduler

 `Private` **\_scheduler**: ``null`` \| `Timeout` = `null`

#### Defined in

[packages/mesh/protocol-plugin-presence/src/presence-plugin.ts:82](https://github.com/dxos/dxos/blob/db8188dae/packages/mesh/protocol-plugin-presence/src/presence-plugin.ts#L82)

___

### extensionsCreated

 `Private` **extensionsCreated**: `number` = `0`

#### Defined in

[packages/mesh/protocol-plugin-presence/src/presence-plugin.ts:62](https://github.com/dxos/dxos/blob/db8188dae/packages/mesh/protocol-plugin-presence/src/presence-plugin.ts#L62)

___

### graphUpdated

 `Readonly` **graphUpdated**: `Event`<`GraphUpdatedEventDetails`\>

#### Defined in

[packages/mesh/protocol-plugin-presence/src/presence-plugin.ts:77](https://github.com/dxos/dxos/blob/db8188dae/packages/mesh/protocol-plugin-presence/src/presence-plugin.ts#L77)

___

### EXTENSION\_NAME

 `Static` **EXTENSION\_NAME**: `string` = `'dxos.mesh.protocol.presence'`

#### Defined in

[packages/mesh/protocol-plugin-presence/src/presence-plugin.ts:60](https://github.com/dxos/dxos/blob/db8188dae/packages/mesh/protocol-plugin-presence/src/presence-plugin.ts#L60)

## Accessors

### graph

`get` **graph**(): `Graph`<`GraphNode`, `any`\> & `EventedType`

#### Returns

`Graph`<`GraphNode`, `any`\> & `EventedType`

#### Defined in

[packages/mesh/protocol-plugin-presence/src/presence-plugin.ts:115](https://github.com/dxos/dxos/blob/db8188dae/packages/mesh/protocol-plugin-presence/src/presence-plugin.ts#L115)

___

### metadata

`get` **metadata**(): `any`

#### Returns

`any`

#### Defined in

[packages/mesh/protocol-plugin-presence/src/presence-plugin.ts:119](https://github.com/dxos/dxos/blob/db8188dae/packages/mesh/protocol-plugin-presence/src/presence-plugin.ts#L119)

___

### peerId

`get` **peerId**(): `Buffer`

#### Returns

`Buffer`

#### Defined in

[packages/mesh/protocol-plugin-presence/src/presence-plugin.ts:102](https://github.com/dxos/dxos/blob/db8188dae/packages/mesh/protocol-plugin-presence/src/presence-plugin.ts#L102)

___

### peers

`get` **peers**(): `Buffer`[]

#### Returns

`Buffer`[]

#### Defined in

[packages/mesh/protocol-plugin-presence/src/presence-plugin.ts:106](https://github.com/dxos/dxos/blob/db8188dae/packages/mesh/protocol-plugin-presence/src/presence-plugin.ts#L106)

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

[packages/mesh/protocol-plugin-presence/src/presence-plugin.ts:301](https://github.com/dxos/dxos/blob/db8188dae/packages/mesh/protocol-plugin-presence/src/presence-plugin.ts#L301)

___

### \_buildBroadcast

`Private` **_buildBroadcast**(): `void`

#### Returns

`void`

#### Defined in

[packages/mesh/protocol-plugin-presence/src/presence-plugin.ts:226](https://github.com/dxos/dxos/blob/db8188dae/packages/mesh/protocol-plugin-presence/src/presence-plugin.ts#L226)

___

### \_buildGraph

`Private` **_buildGraph**(): `void`

#### Returns

`void`

#### Defined in

[packages/mesh/protocol-plugin-presence/src/presence-plugin.ts:181](https://github.com/dxos/dxos/blob/db8188dae/packages/mesh/protocol-plugin-presence/src/presence-plugin.ts#L181)

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

[packages/mesh/protocol-plugin-presence/src/presence-plugin.ts:393](https://github.com/dxos/dxos/blob/db8188dae/packages/mesh/protocol-plugin-presence/src/presence-plugin.ts#L393)

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

[packages/mesh/protocol-plugin-presence/src/presence-plugin.ts:400](https://github.com/dxos/dxos/blob/db8188dae/packages/mesh/protocol-plugin-presence/src/presence-plugin.ts#L400)

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

[packages/mesh/protocol-plugin-presence/src/presence-plugin.ts:275](https://github.com/dxos/dxos/blob/db8188dae/packages/mesh/protocol-plugin-presence/src/presence-plugin.ts#L275)

___

### \_pingLimit

`Private` **_pingLimit**(): `void`

NOTICE: Does not return a Promise cause it could hang if the queue is cleared.

#### Returns

`void`

#### Defined in

[packages/mesh/protocol-plugin-presence/src/presence-plugin.ts:149](https://github.com/dxos/dxos/blob/db8188dae/packages/mesh/protocol-plugin-presence/src/presence-plugin.ts#L149)

___

### \_pruneGraph

`Private` **_pruneGraph**(): `void`

#### Returns

`void`

#### Defined in

[packages/mesh/protocol-plugin-presence/src/presence-plugin.ts:282](https://github.com/dxos/dxos/blob/db8188dae/packages/mesh/protocol-plugin-presence/src/presence-plugin.ts#L282)

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

[packages/mesh/protocol-plugin-presence/src/presence-plugin.ts:327](https://github.com/dxos/dxos/blob/db8188dae/packages/mesh/protocol-plugin-presence/src/presence-plugin.ts#L327)

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

[packages/mesh/protocol-plugin-presence/src/presence-plugin.ts:355](https://github.com/dxos/dxos/blob/db8188dae/packages/mesh/protocol-plugin-presence/src/presence-plugin.ts#L355)

___

### createExtension

**createExtension**(): `Extension`

Create protocol extension.

#### Returns

`Extension`

#### Defined in

[packages/mesh/protocol-plugin-presence/src/presence-plugin.ts:130](https://github.com/dxos/dxos/blob/db8188dae/packages/mesh/protocol-plugin-presence/src/presence-plugin.ts#L130)

___

### ping

**ping**(): `Promise`<`void`\>

#### Returns

`Promise`<`void`\>

#### Defined in

[packages/mesh/protocol-plugin-presence/src/presence-plugin.ts:407](https://github.com/dxos/dxos/blob/db8188dae/packages/mesh/protocol-plugin-presence/src/presence-plugin.ts#L407)

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

[packages/mesh/protocol-plugin-presence/src/presence-plugin.ts:123](https://github.com/dxos/dxos/blob/db8188dae/packages/mesh/protocol-plugin-presence/src/presence-plugin.ts#L123)

___

### start

**start**(): `void`

#### Returns

`void`

#### Defined in

[packages/mesh/protocol-plugin-presence/src/presence-plugin.ts:153](https://github.com/dxos/dxos/blob/db8188dae/packages/mesh/protocol-plugin-presence/src/presence-plugin.ts#L153)

___

### stop

**stop**(): `void`

#### Returns

`void`

#### Defined in

[packages/mesh/protocol-plugin-presence/src/presence-plugin.ts:170](https://github.com/dxos/dxos/blob/db8188dae/packages/mesh/protocol-plugin-presence/src/presence-plugin.ts#L170)
