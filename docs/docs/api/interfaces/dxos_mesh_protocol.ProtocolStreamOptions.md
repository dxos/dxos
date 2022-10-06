# Interface: ProtocolStreamOptions

[@dxos/mesh-protocol](../modules/dxos_mesh_protocol.md).ProtocolStreamOptions

## Hierarchy

- `ProtocolStreamCtorOpts`

  ↳ **`ProtocolStreamOptions`**

## Properties

### encrypted

 `Optional` **encrypted**: ``true``

#### Inherited from

ProtocolStream.ProtocolStreamCtorOpts.encrypted

#### Defined in

[packages/core/mesh/mesh-protocol/src/shims.d.ts:32](https://github.com/dxos/dxos/blob/main/packages/core/mesh/mesh-protocol/src/shims.d.ts#L32)

___

### expectedFeeds

 `Optional` **expectedFeeds**: `number`

Match the discovery_key with a public_key to do the handshake.

#### Defined in

[packages/core/mesh/mesh-protocol/src/protocol.ts:38](https://github.com/dxos/dxos/blob/main/packages/core/mesh/mesh-protocol/src/protocol.ts#L38)

___

### id

 `Optional` **id**: `Buffer`

You can use this to detect if you connect to yourself.

#### Defined in

[packages/core/mesh/mesh-protocol/src/protocol.ts:30](https://github.com/dxos/dxos/blob/main/packages/core/mesh/mesh-protocol/src/protocol.ts#L30)

___

### keyPair

 `Optional` **keyPair**: `Object`

#### Type declaration

| Name | Type |
| :------ | :------ |
| `public_key` | `any` |
| `secret_key` | `any` |

#### Inherited from

ProtocolStream.ProtocolStreamCtorOpts.keyPair

#### Defined in

[packages/core/mesh/mesh-protocol/src/shims.d.ts:38](https://github.com/dxos/dxos/blob/main/packages/core/mesh/mesh-protocol/src/shims.d.ts#L38)

___

### live

 `Optional` **live**: `boolean`

Signal to the other peer that you want to keep this stream open forever.

#### Overrides

ProtocolStream.ProtocolStreamCtorOpts.live

#### Defined in

[packages/core/mesh/mesh-protocol/src/protocol.ts:34](https://github.com/dxos/dxos/blob/main/packages/core/mesh/mesh-protocol/src/protocol.ts#L34)

___

### noise

 `Optional` **noise**: ``true``

#### Inherited from

ProtocolStream.ProtocolStreamCtorOpts.noise

#### Defined in

[packages/core/mesh/mesh-protocol/src/shims.d.ts:34](https://github.com/dxos/dxos/blob/main/packages/core/mesh/mesh-protocol/src/shims.d.ts#L34)

___

### onauthenticate

 `Optional` **onauthenticate**: (`remotePublicKey`: `any`, `done`: `any`) => `any`

#### Type declaration

(`remotePublicKey`, `done`): `any`

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

[packages/core/mesh/mesh-protocol/src/shims.d.ts:40](https://github.com/dxos/dxos/blob/main/packages/core/mesh/mesh-protocol/src/shims.d.ts#L40)

___

### onchannelclose

 `Optional` **onchannelclose**: (`discovery_key`: `any`, `public_key`: `any`) => `any`

#### Type declaration

(`discovery_key`, `public_key`): `any`

##### Parameters

| Name | Type |
| :------ | :------ |
| `discovery_key` | `any` |
| `public_key` | `any` |

##### Returns

`any`

#### Inherited from

ProtocolStream.ProtocolStreamCtorOpts.onchannelclose

#### Defined in

[packages/core/mesh/mesh-protocol/src/shims.d.ts:46](https://github.com/dxos/dxos/blob/main/packages/core/mesh/mesh-protocol/src/shims.d.ts#L46)

___

### ondiscoverykey

 `Optional` **ondiscoverykey**: (`discovery_key`: `any`) => `any`

#### Type declaration

(`discovery_key`): `any`

##### Parameters

| Name | Type |
| :------ | :------ |
| `discovery_key` | `any` |

##### Returns

`any`

#### Inherited from

ProtocolStream.ProtocolStreamCtorOpts.ondiscoverykey

#### Defined in

[packages/core/mesh/mesh-protocol/src/shims.d.ts:44](https://github.com/dxos/dxos/blob/main/packages/core/mesh/mesh-protocol/src/shims.d.ts#L44)

___

### onhandshake

 `Optional` **onhandshake**: (`protocol`: `Protocol`) => `any`

#### Type declaration

(`protocol`): `any`

##### Parameters

| Name | Type |
| :------ | :------ |
| `protocol` | `Protocol` |

##### Returns

`any`

#### Inherited from

ProtocolStream.ProtocolStreamCtorOpts.onhandshake

#### Defined in

[packages/core/mesh/mesh-protocol/src/shims.d.ts:42](https://github.com/dxos/dxos/blob/main/packages/core/mesh/mesh-protocol/src/shims.d.ts#L42)

___

### timeout

 `Optional` **timeout**: ``20000``

#### Inherited from

ProtocolStream.ProtocolStreamCtorOpts.timeout

#### Defined in

[packages/core/mesh/mesh-protocol/src/shims.d.ts:36](https://github.com/dxos/dxos/blob/main/packages/core/mesh/mesh-protocol/src/shims.d.ts#L36)
