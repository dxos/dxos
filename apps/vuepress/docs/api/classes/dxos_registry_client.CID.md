# Class: CID

[@dxos/registry-client](../modules/dxos_registry_client.md).CID

Conten-addressable ID.
https://docs.ipfs.io/concepts/content-addressing

## Table of contents

### Constructors

- [constructor](dxos_registry_client.CID.md#constructor)

### Properties

- [value](dxos_registry_client.CID.md#value)

### Methods

- [[custom]](dxos_registry_client.CID.md#[custom])
- [equals](dxos_registry_client.CID.md#equals)
- [toB58String](dxos_registry_client.CID.md#tob58string)
- [toString](dxos_registry_client.CID.md#tostring)
- [from](dxos_registry_client.CID.md#from)
- [fromB58String](dxos_registry_client.CID.md#fromb58string)

## Constructors

### constructor

• **new CID**(`value`)

#### Parameters

| Name | Type |
| :------ | :------ |
| `value` | `Uint8Array` |

#### Defined in

[packages/sdk/registry-client/src/api/cid.ts:33](https://github.com/dxos/dxos/blob/32ae9b579/packages/sdk/registry-client/src/api/cid.ts#L33)

## Properties

### value

• `Readonly` **value**: `Uint8Array`

#### Defined in

[packages/sdk/registry-client/src/api/cid.ts:34](https://github.com/dxos/dxos/blob/32ae9b579/packages/sdk/registry-client/src/api/cid.ts#L34)

## Methods

### [custom]

▸ **[custom]**(): `string`

#### Returns

`string`

#### Defined in

[packages/sdk/registry-client/src/api/cid.ts:51](https://github.com/dxos/dxos/blob/32ae9b579/packages/sdk/registry-client/src/api/cid.ts#L51)

___

### equals

▸ **equals**(`other`): `boolean`

#### Parameters

| Name | Type |
| :------ | :------ |
| `other` | [`CIDLike`](../modules/dxos_registry_client.md#cidlike) |

#### Returns

`boolean`

#### Defined in

[packages/sdk/registry-client/src/api/cid.ts:39](https://github.com/dxos/dxos/blob/32ae9b579/packages/sdk/registry-client/src/api/cid.ts#L39)

___

### toB58String

▸ **toB58String**(): `string`

#### Returns

`string`

#### Defined in

[packages/sdk/registry-client/src/api/cid.ts:43](https://github.com/dxos/dxos/blob/32ae9b579/packages/sdk/registry-client/src/api/cid.ts#L43)

___

### toString

▸ **toString**(): `string`

#### Returns

`string`

#### Defined in

[packages/sdk/registry-client/src/api/cid.ts:47](https://github.com/dxos/dxos/blob/32ae9b579/packages/sdk/registry-client/src/api/cid.ts#L47)

___

### from

▸ `Static` **from**(`value`): [`CID`](dxos_registry_client.CID.md)

#### Parameters

| Name | Type |
| :------ | :------ |
| `value` | [`CIDLike`](../modules/dxos_registry_client.md#cidlike) |

#### Returns

[`CID`](dxos_registry_client.CID.md)

#### Defined in

[packages/sdk/registry-client/src/api/cid.ts:21](https://github.com/dxos/dxos/blob/32ae9b579/packages/sdk/registry-client/src/api/cid.ts#L21)

___

### fromB58String

▸ `Static` **fromB58String**(`str`): [`CID`](dxos_registry_client.CID.md)

#### Parameters

| Name | Type |
| :------ | :------ |
| `str` | `string` |

#### Returns

[`CID`](dxos_registry_client.CID.md)

#### Defined in

[packages/sdk/registry-client/src/api/cid.ts:16](https://github.com/dxos/dxos/blob/32ae9b579/packages/sdk/registry-client/src/api/cid.ts#L16)
