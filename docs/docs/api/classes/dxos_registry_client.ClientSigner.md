# Class: ClientSigner

[@dxos/registry-client](../modules/dxos_registry_client.md).ClientSigner

Can be used as an external signer for signing DXNS transactions.
Uses a DXNS key stored in HALO.

## Implements

- `Partial`<`Signer`\>

## Constructors

### constructor

**new ClientSigner**(`client`, `registry`, `address`)

#### Parameters

| Name | Type |
| :------ | :------ |
| `client` | `Client` |
| `registry` | `Registry` |
| `address` | `string` |

#### Defined in

[packages/sdk/registry-client/src/util/client-signer.ts:44](https://github.com/dxos/dxos/blob/main/packages/sdk/registry-client/src/util/client-signer.ts#L44)

## Properties

### id

 `Private` **id**: `number` = `0`

#### Defined in

[packages/sdk/registry-client/src/util/client-signer.ts:40](https://github.com/dxos/dxos/blob/main/packages/sdk/registry-client/src/util/client-signer.ts#L40)

___

### public_key

 `Private` `Readonly` **public_key**: `PublicKey`

#### Defined in

[packages/sdk/registry-client/src/util/client-signer.ts:42](https://github.com/dxos/dxos/blob/main/packages/sdk/registry-client/src/util/client-signer.ts#L42)

## Methods

### signRaw

**signRaw**(`__namedParameters`): `Promise`<`SignerResult`\>

#### Parameters

| Name | Type |
| :------ | :------ |
| `__namedParameters` | `SignerPayloadRaw` |

#### Returns

`Promise`<`SignerResult`\>

#### Implementation of

Partial.signRaw

#### Defined in

[packages/sdk/registry-client/src/util/client-signer.ts:52](https://github.com/dxos/dxos/blob/main/packages/sdk/registry-client/src/util/client-signer.ts#L52)
