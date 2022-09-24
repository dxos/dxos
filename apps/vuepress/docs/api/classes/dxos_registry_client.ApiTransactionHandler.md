# Class: ApiTransactionHandler

[@dxos/registry-client](../modules/dxos_registry_client.md).ApiTransactionHandler

TODO(burdon): Comment.

## Table of contents

### Constructors

- [constructor](dxos_registry_client.ApiTransactionHandler.md#constructor)

### Properties

- [signFn](dxos_registry_client.ApiTransactionHandler.md#signfn)

### Methods

- [ensureExtrinsicNotFailed](dxos_registry_client.ApiTransactionHandler.md#ensureextrinsicnotfailed)
- [getErrorName](dxos_registry_client.ApiTransactionHandler.md#geterrorname)
- [sendSudoTransaction](dxos_registry_client.ApiTransactionHandler.md#sendsudotransaction)
- [sendTransaction](dxos_registry_client.ApiTransactionHandler.md#sendtransaction)

## Constructors

### constructor

• **new ApiTransactionHandler**(`api`, `_signFn?`)

#### Parameters

| Name | Type |
| :------ | :------ |
| `api` | `ApiPromise` |
| `_signFn` | [`SignTxFunction`](../modules/dxos_registry_client.md#signtxfunction) \| `AddressOrPair` |

#### Defined in

[packages/sdk/registry-client/src/polkadot/api-transaction-handler.ts:27](https://github.com/dxos/dxos/blob/32ae9b579/packages/sdk/registry-client/src/polkadot/api-transaction-handler.ts#L27)

## Properties

### signFn

• `Private` **signFn**: [`SignTxFunction`](../modules/dxos_registry_client.md#signtxfunction)

#### Defined in

[packages/sdk/registry-client/src/polkadot/api-transaction-handler.ts:25](https://github.com/dxos/dxos/blob/32ae9b579/packages/sdk/registry-client/src/polkadot/api-transaction-handler.ts#L25)

## Methods

### ensureExtrinsicNotFailed

▸ **ensureExtrinsicNotFailed**(`events`): `void`

#### Parameters

| Name | Type |
| :------ | :------ |
| `events` | `EventRecord`[] |

#### Returns

`void`

#### Defined in

[packages/sdk/registry-client/src/polkadot/api-transaction-handler.ts:100](https://github.com/dxos/dxos/blob/32ae9b579/packages/sdk/registry-client/src/polkadot/api-transaction-handler.ts#L100)

___

### getErrorName

▸ **getErrorName**(`rejectionEvent`): `string`

#### Parameters

| Name | Type |
| :------ | :------ |
| `rejectionEvent` | `Event` |

#### Returns

`string`

#### Defined in

[packages/sdk/registry-client/src/polkadot/api-transaction-handler.ts:78](https://github.com/dxos/dxos/blob/32ae9b579/packages/sdk/registry-client/src/polkadot/api-transaction-handler.ts#L78)

___

### sendSudoTransaction

▸ **sendSudoTransaction**(`transaction`, `sudoSignFn`): `Promise`<`SendTransactionResult`\>

#### Parameters

| Name | Type |
| :------ | :------ |
| `transaction` | `Tx` |
| `sudoSignFn` | [`SignTxFunction`](../modules/dxos_registry_client.md#signtxfunction) \| `AddressOrPair` |

#### Returns

`Promise`<`SendTransactionResult`\>

#### Defined in

[packages/sdk/registry-client/src/polkadot/api-transaction-handler.ts:71](https://github.com/dxos/dxos/blob/32ae9b579/packages/sdk/registry-client/src/polkadot/api-transaction-handler.ts#L71)

___

### sendTransaction

▸ **sendTransaction**(`transaction`, `signFn?`): `Promise`<`SendTransactionResult`\>

#### Parameters

| Name | Type |
| :------ | :------ |
| `transaction` | `SubmittableExtrinsic`<``"promise"``, `ISubmittableResult`\> |
| `signFn` | [`SignTxFunction`](../modules/dxos_registry_client.md#signtxfunction) |

#### Returns

`Promise`<`SendTransactionResult`\>

#### Defined in

[packages/sdk/registry-client/src/polkadot/api-transaction-handler.ts:38](https://github.com/dxos/dxos/blob/32ae9b579/packages/sdk/registry-client/src/polkadot/api-transaction-handler.ts#L38)
