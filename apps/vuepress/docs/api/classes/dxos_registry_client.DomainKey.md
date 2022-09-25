# Class: DomainKey

[@dxos/registry-client](../modules/dxos_registry_client.md).DomainKey

Represents a domain key.

Domains must conform to regex: /^[a-z0-9_]+$/.

## Constructors

### constructor

**new DomainKey**(`value`)

#### Parameters

| Name | Type |
| :------ | :------ |
| `value` | `Uint8Array` |

#### Defined in

[packages/sdk/registry-client/src/api/domain-key.ts:24](https://github.com/dxos/dxos/blob/db8188dae/packages/sdk/registry-client/src/api/domain-key.ts#L24)

## Properties

### value

 `Readonly` **value**: `Uint8Array`

#### Defined in

[packages/sdk/registry-client/src/api/domain-key.ts:25](https://github.com/dxos/dxos/blob/db8188dae/packages/sdk/registry-client/src/api/domain-key.ts#L25)

## Methods

### toHex

**toHex**(): `string`

#### Returns

`string`

#### Defined in

[packages/sdk/registry-client/src/api/domain-key.ts:30](https://github.com/dxos/dxos/blob/db8188dae/packages/sdk/registry-client/src/api/domain-key.ts#L30)

___

### toString

**toString**(): `string`

#### Returns

`string`

#### Defined in

[packages/sdk/registry-client/src/api/domain-key.ts:34](https://github.com/dxos/dxos/blob/db8188dae/packages/sdk/registry-client/src/api/domain-key.ts#L34)

___

### fromHex

`Static` **fromHex**(`hexString`): [`DomainKey`](dxos_registry_client.DomainKey.md)

#### Parameters

| Name | Type |
| :------ | :------ |
| `hexString` | `string` |

#### Returns

[`DomainKey`](dxos_registry_client.DomainKey.md)

#### Defined in

[packages/sdk/registry-client/src/api/domain-key.ts:16](https://github.com/dxos/dxos/blob/db8188dae/packages/sdk/registry-client/src/api/domain-key.ts#L16)

___

### random

`Static` **random**(): [`DomainKey`](dxos_registry_client.DomainKey.md)

#### Returns

[`DomainKey`](dxos_registry_client.DomainKey.md)

#### Defined in

[packages/sdk/registry-client/src/api/domain-key.ts:20](https://github.com/dxos/dxos/blob/db8188dae/packages/sdk/registry-client/src/api/domain-key.ts#L20)
