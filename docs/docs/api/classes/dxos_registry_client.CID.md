# Class: CID

[@dxos/registry-client](../modules/dxos_registry_client.md).CID

Conten-addressable ID.
https://docs.ipfs.io/concepts/content-addressing

## Constructors

### constructor

**new CID**(`value`)

#### Parameters

| Name | Type |
| :------ | :------ |
| `value` | `Uint8Array` |

#### Defined in

[packages/sdk/registry-client/src/api/cid.ts:33](https://github.com/dxos/dxos/blob/main/packages/sdk/registry-client/src/api/cid.ts#L33)

## Properties

### value

 `Readonly` **value**: `Uint8Array`

#### Defined in

[packages/sdk/registry-client/src/api/cid.ts:34](https://github.com/dxos/dxos/blob/main/packages/sdk/registry-client/src/api/cid.ts#L34)

## Methods

### [custom]

**[custom]**(): `string`

#### Returns

`string`

#### Defined in

[packages/sdk/registry-client/src/api/cid.ts:51](https://github.com/dxos/dxos/blob/main/packages/sdk/registry-client/src/api/cid.ts#L51)

___

### equals

**equals**(`other`): `boolean`

#### Parameters

| Name | Type |
| :------ | :------ |
| `other` | [`CIDLike`](../types/dxos_registry_client.CIDLike.md) |

#### Returns

`boolean`

#### Defined in

[packages/sdk/registry-client/src/api/cid.ts:39](https://github.com/dxos/dxos/blob/main/packages/sdk/registry-client/src/api/cid.ts#L39)

___

### toB58String

**toB58String**(): `string`

#### Returns

`string`

#### Defined in

[packages/sdk/registry-client/src/api/cid.ts:43](https://github.com/dxos/dxos/blob/main/packages/sdk/registry-client/src/api/cid.ts#L43)

___

### toString

**toString**(): `string`

#### Returns

`string`

#### Defined in

[packages/sdk/registry-client/src/api/cid.ts:47](https://github.com/dxos/dxos/blob/main/packages/sdk/registry-client/src/api/cid.ts#L47)

___

### from

`Static` **from**(`value`): [`CID`](dxos_registry_client.CID.md)

#### Parameters

| Name | Type |
| :------ | :------ |
| `value` | [`CIDLike`](../types/dxos_registry_client.CIDLike.md) |

#### Returns

[`CID`](dxos_registry_client.CID.md)

#### Defined in

[packages/sdk/registry-client/src/api/cid.ts:21](https://github.com/dxos/dxos/blob/main/packages/sdk/registry-client/src/api/cid.ts#L21)

___

### fromB58String

`Static` **fromB58String**(`str`): [`CID`](dxos_registry_client.CID.md)

#### Parameters

| Name | Type |
| :------ | :------ |
| `str` | `string` |

#### Returns

[`CID`](dxos_registry_client.CID.md)

#### Defined in

[packages/sdk/registry-client/src/api/cid.ts:16](https://github.com/dxos/dxos/blob/main/packages/sdk/registry-client/src/api/cid.ts#L16)
