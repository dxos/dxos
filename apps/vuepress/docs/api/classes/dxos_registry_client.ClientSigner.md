# Class: ClientSigner

[@dxos/registry-client](../modules/dxos_registry_client.md).ClientSigner

Can be used as an external signer for signing DXNS transactions.
Uses a DXNS key stored in HALO.

## Implements

- `Partial`<`Signer`\>

## Table of contents

### Constructors

- [constructor](dxos_registry_client.ClientSigner.md#constructor)

### Properties

- [id](dxos_registry_client.ClientSigner.md#id)
- [publicKey](dxos_registry_client.ClientSigner.md#publickey)

### Methods

- [signRaw](dxos_registry_client.ClientSigner.md#signraw)

## Constructors

### constructor

• **new ClientSigner**(`client`, `registry`, `address`)

#### Parameters

| Name | Type |
| :------ | :------ |
| `client` | `Client` |
| `registry` | `Registry` |
| `address` | `string` |

#### Defined in

[packages/sdk/registry-client/src/util/client-signer.ts:43](https://github.com/dxos/dxos/blob/32ae9b579/packages/sdk/registry-client/src/util/client-signer.ts#L43)

## Properties

### id

• `Private` **id**: `number` = `0`

#### Defined in

[packages/sdk/registry-client/src/util/client-signer.ts:39](https://github.com/dxos/dxos/blob/32ae9b579/packages/sdk/registry-client/src/util/client-signer.ts#L39)

___

### publicKey

• `Private` `Readonly` **publicKey**: `PublicKey`

#### Defined in

[packages/sdk/registry-client/src/util/client-signer.ts:41](https://github.com/dxos/dxos/blob/32ae9b579/packages/sdk/registry-client/src/util/client-signer.ts#L41)

## Methods

### signRaw

▸ **signRaw**(`__namedParameters`): `Promise`<`SignerResult`\>

#### Parameters

| Name | Type |
| :------ | :------ |
| `__namedParameters` | `SignerPayloadRaw` |

#### Returns

`Promise`<`SignerResult`\>

#### Implementation of

Partial.signRaw

#### Defined in

[packages/sdk/registry-client/src/util/client-signer.ts:51](https://github.com/dxos/dxos/blob/32ae9b579/packages/sdk/registry-client/src/util/client-signer.ts#L51)
