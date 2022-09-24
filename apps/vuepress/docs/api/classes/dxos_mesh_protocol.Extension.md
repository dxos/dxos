# Class: Extension

[@dxos/mesh-protocol](../modules/dxos_mesh_protocol.md).Extension

Reliable message passing via using Dat protocol extensions.
Events: "send", "receive", "error"

## Hierarchy

- `"nanomessage"`

  ↳ **`Extension`**

## Table of contents

### Constructors

- [constructor](dxos_mesh_protocol.Extension.md#constructor)

### Properties

- [[kCodec]](dxos_mesh_protocol.Extension.md#[kcodec])
- [\_closeHandler](dxos_mesh_protocol.Extension.md#_closehandler)
- [\_feedHandler](dxos_mesh_protocol.Extension.md#_feedhandler)
- [\_handshakeHandler](dxos_mesh_protocol.Extension.md#_handshakehandler)
- [\_initHandler](dxos_mesh_protocol.Extension.md#_inithandler)
- [\_messageHandler](dxos_mesh_protocol.Extension.md#_messagehandler)
- [\_name](dxos_mesh_protocol.Extension.md#_name)
- [\_protocol](dxos_mesh_protocol.Extension.md#_protocol)
- [\_protocolExtension](dxos_mesh_protocol.Extension.md#_protocolextension)
- [\_subscribeCb](dxos_mesh_protocol.Extension.md#_subscribecb)
- [close](dxos_mesh_protocol.Extension.md#close)
- [emit](dxos_mesh_protocol.Extension.md#emit)
- [nmOptions](dxos_mesh_protocol.Extension.md#nmoptions)
- [on](dxos_mesh_protocol.Extension.md#on)
- [open](dxos_mesh_protocol.Extension.md#open)
- [request](dxos_mesh_protocol.Extension.md#request)
- [userSchema](dxos_mesh_protocol.Extension.md#userschema)

### Accessors

- [name](dxos_mesh_protocol.Extension.md#name)

### Methods

- [\_buildMessage](dxos_mesh_protocol.Extension.md#_buildmessage)
- [\_close](dxos_mesh_protocol.Extension.md#_close)
- [\_onMessage](dxos_mesh_protocol.Extension.md#_onmessage)
- [\_open](dxos_mesh_protocol.Extension.md#_open)
- [\_send](dxos_mesh_protocol.Extension.md#_send)
- [\_subscribe](dxos_mesh_protocol.Extension.md#_subscribe)
- [onFeed](dxos_mesh_protocol.Extension.md#onfeed)
- [onHandshake](dxos_mesh_protocol.Extension.md#onhandshake)
- [onInit](dxos_mesh_protocol.Extension.md#oninit)
- [openWithProtocol](dxos_mesh_protocol.Extension.md#openwithprotocol)
- [send](dxos_mesh_protocol.Extension.md#send)
- [setCloseHandler](dxos_mesh_protocol.Extension.md#setclosehandler)
- [setFeedHandler](dxos_mesh_protocol.Extension.md#setfeedhandler)
- [setHandshakeHandler](dxos_mesh_protocol.Extension.md#sethandshakehandler)
- [setInitHandler](dxos_mesh_protocol.Extension.md#setinithandler)
- [setMessageHandler](dxos_mesh_protocol.Extension.md#setmessagehandler)

## Constructors

### constructor

• **new Extension**(`name`, `options?`)

#### Parameters

| Name | Type |
| :------ | :------ |
| `name` | `string` |
| `options` | [`ExtensionOptions`](../interfaces/dxos_mesh_protocol.ExtensionOptions.md) |

#### Overrides

Nanomessage.constructor

#### Defined in

[packages/mesh/mesh-protocol/src/extension.ts:96](https://github.com/dxos/dxos/blob/e3b936721/packages/mesh/mesh-protocol/src/extension.ts#L96)

## Properties

### [kCodec]

• **[kCodec]**: `Codec`<`any`\>

#### Defined in

[packages/mesh/mesh-protocol/src/extension.ts:53](https://github.com/dxos/dxos/blob/e3b936721/packages/mesh/mesh-protocol/src/extension.ts#L53)

___

### \_closeHandler

• `Private` **\_closeHandler**: ``null`` \| [`CloseHandler`](../modules/dxos_mesh_protocol.md#closehandler) = `null`

Close handler.

#### Defined in

[packages/mesh/mesh-protocol/src/extension.ts:76](https://github.com/dxos/dxos/blob/e3b936721/packages/mesh/mesh-protocol/src/extension.ts#L76)

___

### \_feedHandler

• `Private` **\_feedHandler**: ``null`` \| [`FeedHandler`](../modules/dxos_mesh_protocol.md#feedhandler) = `null`

Feed handler.

#### Defined in

[packages/mesh/mesh-protocol/src/extension.ts:87](https://github.com/dxos/dxos/blob/e3b936721/packages/mesh/mesh-protocol/src/extension.ts#L87)

___

### \_handshakeHandler

• `Private` **\_handshakeHandler**: ``null`` \| [`HandshakeHandler`](../modules/dxos_mesh_protocol.md#handshakehandler) = `null`

Handshake handler.

#### Defined in

[packages/mesh/mesh-protocol/src/extension.ts:71](https://github.com/dxos/dxos/blob/e3b936721/packages/mesh/mesh-protocol/src/extension.ts#L71)

___

### \_initHandler

• `Private` **\_initHandler**: ``null`` \| [`InitHandler`](../modules/dxos_mesh_protocol.md#inithandler) = `null`

#### Defined in

[packages/mesh/mesh-protocol/src/extension.ts:66](https://github.com/dxos/dxos/blob/e3b936721/packages/mesh/mesh-protocol/src/extension.ts#L66)

___

### \_messageHandler

• `Private` **\_messageHandler**: ``null`` \| [`MessageHandler`](../modules/dxos_mesh_protocol.md#messagehandler) = `null`

Message handler.

#### Defined in

[packages/mesh/mesh-protocol/src/extension.ts:82](https://github.com/dxos/dxos/blob/e3b936721/packages/mesh/mesh-protocol/src/extension.ts#L82)

___

### \_name

• **\_name**: `any`

#### Defined in

[packages/mesh/mesh-protocol/src/extension.ts:52](https://github.com/dxos/dxos/blob/e3b936721/packages/mesh/mesh-protocol/src/extension.ts#L52)

___

### \_protocol

• `Private` **\_protocol**: ``null`` \| [`Protocol`](dxos_mesh_protocol.Protocol.md) = `null`

#### Defined in

[packages/mesh/mesh-protocol/src/extension.ts:62](https://github.com/dxos/dxos/blob/e3b936721/packages/mesh/mesh-protocol/src/extension.ts#L62)

___

### \_protocolExtension

• `Private` **\_protocolExtension**: ``null`` \| `ProtocolExtension` = `null`

#### Defined in

[packages/mesh/mesh-protocol/src/extension.ts:64](https://github.com/dxos/dxos/blob/e3b936721/packages/mesh/mesh-protocol/src/extension.ts#L64)

___

### \_subscribeCb

• `Private` **\_subscribeCb**: ``null`` \| (`data`: `any`) => `void` = `null`

#### Defined in

[packages/mesh/mesh-protocol/src/extension.ts:89](https://github.com/dxos/dxos/blob/e3b936721/packages/mesh/mesh-protocol/src/extension.ts#L89)

___

### close

• **close**: `any`

#### Defined in

[packages/mesh/mesh-protocol/src/extension.ts:57](https://github.com/dxos/dxos/blob/e3b936721/packages/mesh/mesh-protocol/src/extension.ts#L57)

___

### emit

• **emit**: `any`

#### Defined in

[packages/mesh/mesh-protocol/src/extension.ts:58](https://github.com/dxos/dxos/blob/e3b936721/packages/mesh/mesh-protocol/src/extension.ts#L58)

___

### nmOptions

• **nmOptions**: `any`

#### Defined in

[packages/mesh/mesh-protocol/src/extension.ts:60](https://github.com/dxos/dxos/blob/e3b936721/packages/mesh/mesh-protocol/src/extension.ts#L60)

___

### on

• **on**: `any`

#### Defined in

[packages/mesh/mesh-protocol/src/extension.ts:54](https://github.com/dxos/dxos/blob/e3b936721/packages/mesh/mesh-protocol/src/extension.ts#L54)

___

### open

• **open**: `any`

#### Defined in

[packages/mesh/mesh-protocol/src/extension.ts:55](https://github.com/dxos/dxos/blob/e3b936721/packages/mesh/mesh-protocol/src/extension.ts#L55)

___

### request

• **request**: `any`

#### Defined in

[packages/mesh/mesh-protocol/src/extension.ts:56](https://github.com/dxos/dxos/blob/e3b936721/packages/mesh/mesh-protocol/src/extension.ts#L56)

___

### userSchema

• **userSchema**: `any`

#### Defined in

[packages/mesh/mesh-protocol/src/extension.ts:59](https://github.com/dxos/dxos/blob/e3b936721/packages/mesh/mesh-protocol/src/extension.ts#L59)

## Accessors

### name

• `get` **name**(): `any`

#### Returns

`any`

#### Defined in

[packages/mesh/mesh-protocol/src/extension.ts:113](https://github.com/dxos/dxos/blob/e3b936721/packages/mesh/mesh-protocol/src/extension.ts#L113)

## Methods

### \_buildMessage

▸ `Private` **_buildMessage**(`message`): `any`

Wrap a message in a `dxos.protocol.Buffer` if required to be sent over the wire.

#### Parameters

| Name | Type |
| :------ | :------ |
| `message` | `Buffer` \| `Uint8Array` \| `WithTypeUrl`<`object`\> |

#### Returns

`any`

#### Defined in

[packages/mesh/mesh-protocol/src/extension.ts:351](https://github.com/dxos/dxos/blob/e3b936721/packages/mesh/mesh-protocol/src/extension.ts#L351)

___

### \_close

▸ `Private` **_close**(): `Promise`<`void`\>

#### Returns

`Promise`<`void`\>

#### Defined in

[packages/mesh/mesh-protocol/src/extension.ts:298](https://github.com/dxos/dxos/blob/e3b936721/packages/mesh/mesh-protocol/src/extension.ts#L298)

___

### \_onMessage

▸ `Private` **_onMessage**(`msg`): `Promise`<`any`\>

_onMessage from Nanomessagerpc

#### Parameters

| Name | Type |
| :------ | :------ |
| `msg` | `any` |

#### Returns

`Promise`<`any`\>

#### Defined in

[packages/mesh/mesh-protocol/src/extension.ts:329](https://github.com/dxos/dxos/blob/e3b936721/packages/mesh/mesh-protocol/src/extension.ts#L329)

___

### \_open

▸ `Private` **_open**(): `Promise`<`void`\>

#### Returns

`Promise`<`void`\>

#### Defined in

[packages/mesh/mesh-protocol/src/extension.ts:286](https://github.com/dxos/dxos/blob/e3b936721/packages/mesh/mesh-protocol/src/extension.ts#L286)

___

### \_send

▸ `Private` **_send**(`chunk`): `void`

**`Overrides`**

_send in Nanomessage

#### Parameters

| Name | Type |
| :------ | :------ |
| `chunk` | `Uint8Array` |

#### Returns

`void`

#### Defined in

[packages/mesh/mesh-protocol/src/extension.ts:317](https://github.com/dxos/dxos/blob/e3b936721/packages/mesh/mesh-protocol/src/extension.ts#L317)

___

### \_subscribe

▸ `Private` **_subscribe**(`next`): `void`

#### Parameters

| Name | Type |
| :------ | :------ |
| `next` | (`msg`: `any`) => `Promise`<`void`\> |

#### Returns

`void`

#### Defined in

[packages/mesh/mesh-protocol/src/extension.ts:310](https://github.com/dxos/dxos/blob/e3b936721/packages/mesh/mesh-protocol/src/extension.ts#L310)

___

### onFeed

▸ **onFeed**(`discoveryKey`): `Promise`<`void`\>

Feed event.

#### Parameters

| Name | Type |
| :------ | :------ |
| `discoveryKey` | `Buffer` |

#### Returns

`Promise`<`void`\>

#### Defined in

[packages/mesh/mesh-protocol/src/extension.ts:230](https://github.com/dxos/dxos/blob/e3b936721/packages/mesh/mesh-protocol/src/extension.ts#L230)

___

### onHandshake

▸ **onHandshake**(): `Promise`<`void`\>

Handshake event.

#### Returns

`Promise`<`void`\>

#### Defined in

[packages/mesh/mesh-protocol/src/extension.ts:209](https://github.com/dxos/dxos/blob/e3b936721/packages/mesh/mesh-protocol/src/extension.ts#L209)

___

### onInit

▸ **onInit**(): `Promise`<`void`\>

#### Returns

`Promise`<`void`\>

#### Defined in

[packages/mesh/mesh-protocol/src/extension.ts:189](https://github.com/dxos/dxos/blob/e3b936721/packages/mesh/mesh-protocol/src/extension.ts#L189)

___

### openWithProtocol

▸ **openWithProtocol**(`protocol`): `Promise`<`void`\>

Initializes the extension.

#### Parameters

| Name | Type |
| :------ | :------ |
| `protocol` | [`Protocol`](dxos_mesh_protocol.Protocol.md) |

#### Returns

`Promise`<`void`\>

#### Defined in

[packages/mesh/mesh-protocol/src/extension.ts:171](https://github.com/dxos/dxos/blob/e3b936721/packages/mesh/mesh-protocol/src/extension.ts#L171)

___

### send

▸ **send**(`message`, `options?`): `Promise`<`any`\>

Sends a message to peer.

#### Parameters

| Name | Type |
| :------ | :------ |
| `message` | `Buffer` \| `Uint8Array` \| `WithTypeUrl`<`object`\> |
| `options` | `Object` |
| `options.oneway?` | `boolean` |

#### Returns

`Promise`<`any`\>

Response from peer.

#### Defined in

[packages/mesh/mesh-protocol/src/extension.ts:253](https://github.com/dxos/dxos/blob/e3b936721/packages/mesh/mesh-protocol/src/extension.ts#L253)

___

### setCloseHandler

▸ **setCloseHandler**(`closeHandler`): [`Extension`](dxos_mesh_protocol.Extension.md)

Sets the close stream handler.

#### Parameters

| Name | Type | Description |
| :------ | :------ | :------ |
| `closeHandler` | [`CloseHandler`](../modules/dxos_mesh_protocol.md#closehandler) | Close handler. |

#### Returns

[`Extension`](dxos_mesh_protocol.Extension.md)

#### Defined in

[packages/mesh/mesh-protocol/src/extension.ts:138](https://github.com/dxos/dxos/blob/e3b936721/packages/mesh/mesh-protocol/src/extension.ts#L138)

___

### setFeedHandler

▸ **setFeedHandler**(`feedHandler`): [`Extension`](dxos_mesh_protocol.Extension.md)

Sets the message handler.

#### Parameters

| Name | Type | Description |
| :------ | :------ | :------ |
| `feedHandler` | [`FeedHandler`](../modules/dxos_mesh_protocol.md#feedhandler) | Async feed handler. |

#### Returns

[`Extension`](dxos_mesh_protocol.Extension.md)

#### Defined in

[packages/mesh/mesh-protocol/src/extension.ts:160](https://github.com/dxos/dxos/blob/e3b936721/packages/mesh/mesh-protocol/src/extension.ts#L160)

___

### setHandshakeHandler

▸ **setHandshakeHandler**(`handshakeHandler`): [`Extension`](dxos_mesh_protocol.Extension.md)

Sets the handshake handler.

#### Parameters

| Name | Type | Description |
| :------ | :------ | :------ |
| `handshakeHandler` | [`HandshakeHandler`](../modules/dxos_mesh_protocol.md#handshakehandler) | Async handshake handler. |

#### Returns

[`Extension`](dxos_mesh_protocol.Extension.md)

#### Defined in

[packages/mesh/mesh-protocol/src/extension.ts:127](https://github.com/dxos/dxos/blob/e3b936721/packages/mesh/mesh-protocol/src/extension.ts#L127)

___

### setInitHandler

▸ **setInitHandler**(`initHandler`): [`Extension`](dxos_mesh_protocol.Extension.md)

#### Parameters

| Name | Type |
| :------ | :------ |
| `initHandler` | [`InitHandler`](../modules/dxos_mesh_protocol.md#inithandler) |

#### Returns

[`Extension`](dxos_mesh_protocol.Extension.md)

#### Defined in

[packages/mesh/mesh-protocol/src/extension.ts:117](https://github.com/dxos/dxos/blob/e3b936721/packages/mesh/mesh-protocol/src/extension.ts#L117)

___

### setMessageHandler

▸ **setMessageHandler**(`messageHandler`): [`Extension`](dxos_mesh_protocol.Extension.md)

Sets the message handler.

#### Parameters

| Name | Type | Description |
| :------ | :------ | :------ |
| `messageHandler` | [`MessageHandler`](../modules/dxos_mesh_protocol.md#messagehandler) | Async message handler. |

#### Returns

[`Extension`](dxos_mesh_protocol.Extension.md)

#### Defined in

[packages/mesh/mesh-protocol/src/extension.ts:149](https://github.com/dxos/dxos/blob/e3b936721/packages/mesh/mesh-protocol/src/extension.ts#L149)
