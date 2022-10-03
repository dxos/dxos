# Class: ClientSignerAdapter

[@dxos/registry-client](../modules/dxos_registry_client.md).ClientSignerAdapter

Plugin to sign HALO messages.

## Implements

- `HaloSigner`

## Constructors

### constructor

**new ClientSignerAdapter**()

## Methods

### sign

**sign**(`request`, `key`): `Promise`<`SignResponse`\>

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

[packages/sdk/registry-client/src/util/client-signer.ts:18](https://github.com/dxos/dxos/blob/main/packages/sdk/registry-client/src/util/client-signer.ts#L18)
