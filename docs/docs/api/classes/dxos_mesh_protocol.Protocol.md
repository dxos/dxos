# Class: Protocol

[@dxos/mesh-protocol](../modules/dxos_mesh_protocol.md).Protocol

Wraps a hypercore-protocol object.

## Constructors

### constructor

**new Protocol**(`options?`)

#### Parameters

| Name | Type |
| :------ | :------ |
| `options` | [`ProtocolOptions`](../interfaces/dxos_mesh_protocol.ProtocolOptions.md) |

#### Defined in

[packages/mesh/mesh-protocol/src/protocol.ts:104](https://github.com/dxos/dxos/blob/main/packages/mesh/mesh-protocol/src/protocol.ts#L104)

## Properties

### \_channel

 `Private` `Optional` **\_channel**: `any` = `undefined`

https://github.com/mafintosh/hypercore-protocol#var-feed--streamfeedkey

#### Defined in

[packages/mesh/mesh-protocol/src/protocol.ts:97](https://github.com/dxos/dxos/blob/main/packages/mesh/mesh-protocol/src/protocol.ts#L97)

___

### \_connected

 `Private` **\_connected**: `boolean` = `false`

#### Defined in

[packages/mesh/mesh-protocol/src/protocol.ts:78](https://github.com/dxos/dxos/blob/main/packages/mesh/mesh-protocol/src/protocol.ts#L78)

___

### \_context

 `Private` **\_context**: `Record`<`string`, `any`\> = `{}`

Local object to store data for extensions.

#### Defined in

[packages/mesh/mesh-protocol/src/protocol.ts:102](https://github.com/dxos/dxos/blob/main/packages/mesh/mesh-protocol/src/protocol.ts#L102)

___

### \_discoveryKey

 `Private` `Optional` **\_discoveryKey**: `Buffer`

#### Defined in

[packages/mesh/mesh-protocol/src/protocol.ts:81](https://github.com/dxos/dxos/blob/main/packages/mesh/mesh-protocol/src/protocol.ts#L81)

___

### \_discoveryToPublicKey

 `Private` **\_discoveryToPublicKey**: `undefined` \| (`discoveryKey`: `Buffer`) => `undefined` \| `Buffer`

#### Defined in

[packages/mesh/mesh-protocol/src/protocol.ts:73](https://github.com/dxos/dxos/blob/main/packages/mesh/mesh-protocol/src/protocol.ts#L73)

___

### \_extensionInit

 `Private` **\_extensionInit**: `ExtensionInit`

#### Defined in

[packages/mesh/mesh-protocol/src/protocol.ts:76](https://github.com/dxos/dxos/blob/main/packages/mesh/mesh-protocol/src/protocol.ts#L76)

___

### \_extensionMap

 `Private` **\_extensionMap**: `Map`<`string`, [`Extension`](dxos_mesh_protocol.Extension.md)\>

Protocol extensions.

#### Defined in

[packages/mesh/mesh-protocol/src/protocol.ts:86](https://github.com/dxos/dxos/blob/main/packages/mesh/mesh-protocol/src/protocol.ts#L86)

___

### \_handshakes

 `Private` **\_handshakes**: (`protocol`: [`Protocol`](dxos_mesh_protocol.Protocol.md)) => `Promise`<`void`\>[] = `[]`

#### Defined in

[packages/mesh/mesh-protocol/src/protocol.ts:79](https://github.com/dxos/dxos/blob/main/packages/mesh/mesh-protocol/src/protocol.ts#L79)

___

### \_init

 `Private` **\_init**: `boolean` = `false`

#### Defined in

[packages/mesh/mesh-protocol/src/protocol.ts:77](https://github.com/dxos/dxos/blob/main/packages/mesh/mesh-protocol/src/protocol.ts#L77)

___

### \_initTimeout

 `Private` **\_initTimeout**: `number`

#### Defined in

[packages/mesh/mesh-protocol/src/protocol.ts:75](https://github.com/dxos/dxos/blob/main/packages/mesh/mesh-protocol/src/protocol.ts#L75)

___

### \_initiator

 `Private` **\_initiator**: `boolean`

#### Defined in

[packages/mesh/mesh-protocol/src/protocol.ts:80](https://github.com/dxos/dxos/blob/main/packages/mesh/mesh-protocol/src/protocol.ts#L80)

___

### \_isOpen

 `Private` **\_isOpen**: `boolean` = `false`

#### Defined in

[packages/mesh/mesh-protocol/src/protocol.ts:66](https://github.com/dxos/dxos/blob/main/packages/mesh/mesh-protocol/src/protocol.ts#L66)

___

### \_stream

 `Private` **\_stream**: `ProtocolStream`

https://github.com/mafintosh/hypercore-protocol

#### Defined in

[packages/mesh/mesh-protocol/src/protocol.ts:91](https://github.com/dxos/dxos/blob/main/packages/mesh/mesh-protocol/src/protocol.ts#L91)

___

### \_streamOptions

 `Private` **\_streamOptions**: `undefined` \| `ProtocolStreamCtorOpts`

#### Defined in

[packages/mesh/mesh-protocol/src/protocol.ts:74](https://github.com/dxos/dxos/blob/main/packages/mesh/mesh-protocol/src/protocol.ts#L74)

___

### error

 `Readonly` **error**: `Event`<`Error`\>

#### Defined in

[packages/mesh/mesh-protocol/src/protocol.ts:68](https://github.com/dxos/dxos/blob/main/packages/mesh/mesh-protocol/src/protocol.ts#L68)

___

### extensionsHandshake

 `Readonly` **extensionsHandshake**: `Event`<`void`\>

#### Defined in

[packages/mesh/mesh-protocol/src/protocol.ts:70](https://github.com/dxos/dxos/blob/main/packages/mesh/mesh-protocol/src/protocol.ts#L70)

___

### extensionsInitialized

 `Readonly` **extensionsInitialized**: `Event`<`void`\>

#### Defined in

[packages/mesh/mesh-protocol/src/protocol.ts:69](https://github.com/dxos/dxos/blob/main/packages/mesh/mesh-protocol/src/protocol.ts#L69)

___

### handshake

 `Readonly` **handshake**: `Event`<[`Protocol`](dxos_mesh_protocol.Protocol.md)\>

#### Defined in

[packages/mesh/mesh-protocol/src/protocol.ts:71](https://github.com/dxos/dxos/blob/main/packages/mesh/mesh-protocol/src/protocol.ts#L71)

## Accessors

### channel

`get` **channel**(): `any`

#### Returns

`any`

#### Defined in

[packages/mesh/mesh-protocol/src/protocol.ts:155](https://github.com/dxos/dxos/blob/main/packages/mesh/mesh-protocol/src/protocol.ts#L155)

___

### connected

`get` **connected**(): `boolean`

#### Returns

`boolean`

#### Defined in

[packages/mesh/mesh-protocol/src/protocol.ts:171](https://github.com/dxos/dxos/blob/main/packages/mesh/mesh-protocol/src/protocol.ts#L171)

___

### extensionNames

`get` **extensionNames**(): `string`[]

#### Returns

`string`[]

#### Defined in

[packages/mesh/mesh-protocol/src/protocol.ts:163](https://github.com/dxos/dxos/blob/main/packages/mesh/mesh-protocol/src/protocol.ts#L163)

___

### extensions

`get` **extensions**(): [`Extension`](dxos_mesh_protocol.Extension.md)[]

#### Returns

[`Extension`](dxos_mesh_protocol.Extension.md)[]

#### Defined in

[packages/mesh/mesh-protocol/src/protocol.ts:159](https://github.com/dxos/dxos/blob/main/packages/mesh/mesh-protocol/src/protocol.ts#L159)

___

### id

`get` **id**(): `any`

#### Returns

`any`

#### Defined in

[packages/mesh/mesh-protocol/src/protocol.ts:147](https://github.com/dxos/dxos/blob/main/packages/mesh/mesh-protocol/src/protocol.ts#L147)

___

### initiator

`get` **initiator**(): `boolean`

#### Returns

`boolean`

#### Defined in

[packages/mesh/mesh-protocol/src/protocol.ts:175](https://github.com/dxos/dxos/blob/main/packages/mesh/mesh-protocol/src/protocol.ts#L175)

___

### stream

`get` **stream**(): `ProtocolStream`

#### Returns

`ProtocolStream`

#### Defined in

[packages/mesh/mesh-protocol/src/protocol.ts:151](https://github.com/dxos/dxos/blob/main/packages/mesh/mesh-protocol/src/protocol.ts#L151)

___

### streamOptions

`get` **streamOptions**(): { `id`: `any`  } & `ProtocolStreamCtorOpts`

#### Returns

{ `id`: `any`  } & `ProtocolStreamCtorOpts`

#### Defined in

[packages/mesh/mesh-protocol/src/protocol.ts:167](https://github.com/dxos/dxos/blob/main/packages/mesh/mesh-protocol/src/protocol.ts#L167)

## Methods

### \_extensionHandler

`Private` **_extensionHandler**(`name`, `message`): `void`

Handles extension messages.

#### Parameters

| Name | Type |
| :------ | :------ |
| `name` | `string` |
| `message` | `any` |

#### Returns

`void`

#### Defined in

[packages/mesh/mesh-protocol/src/protocol.ts:386](https://github.com/dxos/dxos/blob/main/packages/mesh/mesh-protocol/src/protocol.ts#L386)

___

### \_handshakeExtensions

`Private` **_handshakeExtensions**(): `Promise`<`void`\>

#### Returns

`Promise`<`void`\>

#### Defined in

[packages/mesh/mesh-protocol/src/protocol.ts:321](https://github.com/dxos/dxos/blob/main/packages/mesh/mesh-protocol/src/protocol.ts#L321)

___

### \_initExtensions

`Private` **_initExtensions**(`userSession?`): `Promise`<`void`\>

#### Parameters

| Name | Type |
| :------ | :------ |
| `userSession?` | `Record`<`string`, `any`\> |

#### Returns

`Promise`<`void`\>

#### Defined in

[packages/mesh/mesh-protocol/src/protocol.ts:304](https://github.com/dxos/dxos/blob/main/packages/mesh/mesh-protocol/src/protocol.ts#L304)

___

### \_openConnection

`Private` **_openConnection**(): `void`

#### Returns

`void`

#### Defined in

[packages/mesh/mesh-protocol/src/protocol.ts:348](https://github.com/dxos/dxos/blob/main/packages/mesh/mesh-protocol/src/protocol.ts#L348)

___

### \_openExtensions

`Private` **_openExtensions**(): `Promise`<`void`\>

#### Returns

`Promise`<`void`\>

#### Defined in

[packages/mesh/mesh-protocol/src/protocol.ts:295](https://github.com/dxos/dxos/blob/main/packages/mesh/mesh-protocol/src/protocol.ts#L295)

___

### close

**close**(): `Promise`<`void`\>

#### Returns

`Promise`<`void`\>

#### Defined in

[packages/mesh/mesh-protocol/src/protocol.ts:271](https://github.com/dxos/dxos/blob/main/packages/mesh/mesh-protocol/src/protocol.ts#L271)

___

### getContext

**getContext**(): `any`

Get local context.

#### Returns

`any`

#### Defined in

[packages/mesh/mesh-protocol/src/protocol.ts:202](https://github.com/dxos/dxos/blob/main/packages/mesh/mesh-protocol/src/protocol.ts#L202)

___

### getExtension

**getExtension**(`name`): `undefined` \| [`Extension`](dxos_mesh_protocol.Extension.md)

Returns the extension by name.

#### Parameters

| Name | Type |
| :------ | :------ |
| `name` | `string` |

#### Returns

`undefined` \| [`Extension`](dxos_mesh_protocol.Extension.md)

#### Defined in

[packages/mesh/mesh-protocol/src/protocol.ts:228](https://github.com/dxos/dxos/blob/main/packages/mesh/mesh-protocol/src/protocol.ts#L228)

___

### getSession

**getSession**(): ``null`` \| `Record`<`string`, `any`\>

Get remote session data.

#### Returns

``null`` \| `Record`<`string`, `any`\>

#### Defined in

[packages/mesh/mesh-protocol/src/protocol.ts:182](https://github.com/dxos/dxos/blob/main/packages/mesh/mesh-protocol/src/protocol.ts#L182)

___

### init

**init**(): [`Protocol`](dxos_mesh_protocol.Protocol.md)

#### Returns

[`Protocol`](dxos_mesh_protocol.Protocol.md)

#### Defined in

[packages/mesh/mesh-protocol/src/protocol.ts:246](https://github.com/dxos/dxos/blob/main/packages/mesh/mesh-protocol/src/protocol.ts#L246)

___

### open

**open**(): `Promise`<`void`\>

#### Returns

`Promise`<`void`\>

#### Defined in

[packages/mesh/mesh-protocol/src/protocol.ts:255](https://github.com/dxos/dxos/blob/main/packages/mesh/mesh-protocol/src/protocol.ts#L255)

___

### setContext

**setContext**(`context`): [`Protocol`](dxos_mesh_protocol.Protocol.md)

Set local context.

#### Parameters

| Name | Type |
| :------ | :------ |
| `context` | `any` |

#### Returns

[`Protocol`](dxos_mesh_protocol.Protocol.md)

#### Defined in

[packages/mesh/mesh-protocol/src/protocol.ts:193](https://github.com/dxos/dxos/blob/main/packages/mesh/mesh-protocol/src/protocol.ts#L193)

___

### setExtension

**setExtension**(`extension`): [`Protocol`](dxos_mesh_protocol.Protocol.md)

Sets the named extension.

#### Parameters

| Name | Type |
| :------ | :------ |
| `extension` | [`Extension`](dxos_mesh_protocol.Extension.md) |

#### Returns

[`Protocol`](dxos_mesh_protocol.Protocol.md)

#### Defined in

[packages/mesh/mesh-protocol/src/protocol.ts:209](https://github.com/dxos/dxos/blob/main/packages/mesh/mesh-protocol/src/protocol.ts#L209)

___

### setExtensions

**setExtensions**(`extensions`): [`Protocol`](dxos_mesh_protocol.Protocol.md)

Sets the set of extensions.

#### Parameters

| Name | Type |
| :------ | :------ |
| `extensions` | [`Extension`](dxos_mesh_protocol.Extension.md)[] |

#### Returns

[`Protocol`](dxos_mesh_protocol.Protocol.md)

#### Defined in

[packages/mesh/mesh-protocol/src/protocol.ts:219](https://github.com/dxos/dxos/blob/main/packages/mesh/mesh-protocol/src/protocol.ts#L219)

___

### setHandshakeHandler

**setHandshakeHandler**(`handler`): [`Protocol`](dxos_mesh_protocol.Protocol.md)

Set protocol handshake handler.

#### Parameters

| Name | Type |
| :------ | :------ |
| `handler` | (`protocol`: [`Protocol`](dxos_mesh_protocol.Protocol.md)) => `void` |

#### Returns

[`Protocol`](dxos_mesh_protocol.Protocol.md)

#### Defined in

[packages/mesh/mesh-protocol/src/protocol.ts:235](https://github.com/dxos/dxos/blob/main/packages/mesh/mesh-protocol/src/protocol.ts#L235)

___

### toString

**toString**(): `string`

#### Returns

`string`

#### Defined in

[packages/mesh/mesh-protocol/src/protocol.ts:138](https://github.com/dxos/dxos/blob/main/packages/mesh/mesh-protocol/src/protocol.ts#L138)

___

### waitForHandshake

**waitForHandshake**(): `Promise`<`void`\>

#### Returns

`Promise`<`void`\>

#### Defined in

[packages/mesh/mesh-protocol/src/protocol.ts:288](https://github.com/dxos/dxos/blob/main/packages/mesh/mesh-protocol/src/protocol.ts#L288)
