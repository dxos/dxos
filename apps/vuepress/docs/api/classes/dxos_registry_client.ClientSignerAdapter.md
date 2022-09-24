# Class: ClientSignerAdapter

[@dxos/registry-client](../modules/dxos_registry_client.md).ClientSignerAdapter

Plugin to sign HALO messages.

## Implements

- `HaloSigner`

## Table of contents

### Constructors

- [constructor](dxos_registry_client.ClientSignerAdapter.md#constructor)

### Methods

- [sign](dxos_registry_client.ClientSignerAdapter.md#sign)

## Constructors

### constructor

• **new ClientSignerAdapter**()

## Methods

### sign

▸ **sign**(`request`, `key`): `Promise`<`SignResponse`\>

#### Parameters

| Name | Type |
| :------ | :------ |
| `request` | `SignRequest` |
| `key` | `KeyRecord` |

#### Returns

`Promise`<`SignResponse`\>

#### Implementation of

HaloSigner.sign

#### Defined in

[packages/sdk/registry-client/src/util/client-signer.ts:18](https://github.com/dxos/dxos/blob/32ae9b579/packages/sdk/registry-client/src/util/client-signer.ts#L18)
