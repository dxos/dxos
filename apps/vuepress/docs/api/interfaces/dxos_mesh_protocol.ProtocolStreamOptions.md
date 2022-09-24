# Interface: ProtocolStreamOptions

[@dxos/mesh-protocol](../modules/dxos_mesh_protocol.md).ProtocolStreamOptions

## Hierarchy

- `ProtocolStreamCtorOpts`

  ↳ **`ProtocolStreamOptions`**

## Table of contents

### Properties

- [encrypted](dxos_mesh_protocol.ProtocolStreamOptions.md#encrypted)
- [expectedFeeds](dxos_mesh_protocol.ProtocolStreamOptions.md#expectedfeeds)
- [id](dxos_mesh_protocol.ProtocolStreamOptions.md#id)
- [keyPair](dxos_mesh_protocol.ProtocolStreamOptions.md#keypair)
- [live](dxos_mesh_protocol.ProtocolStreamOptions.md#live)
- [noise](dxos_mesh_protocol.ProtocolStreamOptions.md#noise)
- [onauthenticate](dxos_mesh_protocol.ProtocolStreamOptions.md#onauthenticate)
- [onchannelclose](dxos_mesh_protocol.ProtocolStreamOptions.md#onchannelclose)
- [ondiscoverykey](dxos_mesh_protocol.ProtocolStreamOptions.md#ondiscoverykey)
- [onhandshake](dxos_mesh_protocol.ProtocolStreamOptions.md#onhandshake)
- [timeout](dxos_mesh_protocol.ProtocolStreamOptions.md#timeout)

## Properties

### encrypted

• `Optional` **encrypted**: ``true``

#### Inherited from

ProtocolStream.ProtocolStreamCtorOpts.encrypted

#### Defined in

[packages/mesh/mesh-protocol/src/shims.d.ts:32](https://github.com/dxos/dxos/blob/32ae9b579/packages/mesh/mesh-protocol/src/shims.d.ts#L32)

___

### expectedFeeds

• `Optional` **expectedFeeds**: `number`

Match the discoveryKey with a publicKey to do the handshake.

#### Defined in

[packages/mesh/mesh-protocol/src/protocol.ts:38](https://github.com/dxos/dxos/blob/32ae9b579/packages/mesh/mesh-protocol/src/protocol.ts#L38)

___

### id

• `Optional` **id**: `Buffer`

You can use this to detect if you connect to yourself.

#### Defined in

[packages/mesh/mesh-protocol/src/protocol.ts:30](https://github.com/dxos/dxos/blob/32ae9b579/packages/mesh/mesh-protocol/src/protocol.ts#L30)

___

### keyPair

• `Optional` **keyPair**: `Object`

#### Type declaration

| Name | Type |
| :------ | :------ |
| `publicKey` | `any` |
| `secretKey` | `any` |

#### Inherited from

ProtocolStream.ProtocolStreamCtorOpts.keyPair

#### Defined in

[packages/mesh/mesh-protocol/src/shims.d.ts:38](https://github.com/dxos/dxos/blob/32ae9b579/packages/mesh/mesh-protocol/src/shims.d.ts#L38)

___

### live

• `Optional` **live**: `boolean`

Signal to the other peer that you want to keep this stream open forever.

#### Overrides

ProtocolStream.ProtocolStreamCtorOpts.live

#### Defined in

[packages/mesh/mesh-protocol/src/protocol.ts:34](https://github.com/dxos/dxos/blob/32ae9b579/packages/mesh/mesh-protocol/src/protocol.ts#L34)

___

### noise

• `Optional` **noise**: ``true``

#### Inherited from

ProtocolStream.ProtocolStreamCtorOpts.noise

#### Defined in

[packages/mesh/mesh-protocol/src/shims.d.ts:34](https://github.com/dxos/dxos/blob/32ae9b579/packages/mesh/mesh-protocol/src/shims.d.ts#L34)

___

### onauthenticate

• `Optional` **onauthenticate**: (`remotePublicKey`: `any`, `done`: `any`) => `any`

#### Type declaration

▸ (`remotePublicKey`, `done`): `any`

##### Parameters

| Name | Type |
| :------ | :------ |
| `remotePublicKey` | `any` |
| `done` | `any` |

##### Returns

`any`

#### Inherited from

ProtocolStream.ProtocolStreamCtorOpts.onauthenticate

#### Defined in

[packages/mesh/mesh-protocol/src/shims.d.ts:40](https://github.com/dxos/dxos/blob/32ae9b579/packages/mesh/mesh-protocol/src/shims.d.ts#L40)

___

### onchannelclose

• `Optional` **onchannelclose**: (`discoveryKey`: `any`, `publicKey`: `any`) => `any`

#### Type declaration

▸ (`discoveryKey`, `publicKey`): `any`

##### Parameters

| Name | Type |
| :------ | :------ |
| `discoveryKey` | `any` |
| `publicKey` | `any` |

##### Returns

`any`

#### Inherited from

ProtocolStream.ProtocolStreamCtorOpts.onchannelclose

#### Defined in

[packages/mesh/mesh-protocol/src/shims.d.ts:46](https://github.com/dxos/dxos/blob/32ae9b579/packages/mesh/mesh-protocol/src/shims.d.ts#L46)

___

### ondiscoverykey

• `Optional` **ondiscoverykey**: (`discoveryKey`: `any`) => `any`

#### Type declaration

▸ (`discoveryKey`): `any`

##### Parameters

| Name | Type |
| :------ | :------ |
| `discoveryKey` | `any` |

##### Returns

`any`

#### Inherited from

ProtocolStream.ProtocolStreamCtorOpts.ondiscoverykey

#### Defined in

[packages/mesh/mesh-protocol/src/shims.d.ts:44](https://github.com/dxos/dxos/blob/32ae9b579/packages/mesh/mesh-protocol/src/shims.d.ts#L44)

___

### onhandshake

• `Optional` **onhandshake**: (`protocol`: `Protocol`) => `any`

#### Type declaration

▸ (`protocol`): `any`

##### Parameters

| Name | Type |
| :------ | :------ |
| `protocol` | `Protocol` |

##### Returns

`any`

#### Inherited from

ProtocolStream.ProtocolStreamCtorOpts.onhandshake

#### Defined in

[packages/mesh/mesh-protocol/src/shims.d.ts:42](https://github.com/dxos/dxos/blob/32ae9b579/packages/mesh/mesh-protocol/src/shims.d.ts#L42)

___

### timeout

• `Optional` **timeout**: ``20000``

#### Inherited from

ProtocolStream.ProtocolStreamCtorOpts.timeout

#### Defined in

[packages/mesh/mesh-protocol/src/shims.d.ts:36](https://github.com/dxos/dxos/blob/32ae9b579/packages/mesh/mesh-protocol/src/shims.d.ts#L36)
