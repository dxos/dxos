# Interface: ClientServiceProvider

[@dxos/client](../modules/dxos_client.md).ClientServiceProvider

## Implemented by

- [`ClientServiceHost`](../classes/dxos_client.ClientServiceHost.md)
- [`ClientServiceProxy`](../classes/dxos_client.ClientServiceProxy.md)

## Table of contents

### Properties

- [services](dxos_client.ClientServiceProvider.md#services)

### Methods

- [close](dxos_client.ClientServiceProvider.md#close)
- [open](dxos_client.ClientServiceProvider.md#open)

## Properties

### services

• **services**: [`ClientServices`](../modules/dxos_client.md#clientservices)

#### Defined in

[packages/sdk/client/src/packlets/api/client-service.ts:38](https://github.com/dxos/dxos/blob/32ae9b579/packages/sdk/client/src/packlets/api/client-service.ts#L38)

## Methods

### close

▸ **close**(): `Promise`<`void`\>

#### Returns

`Promise`<`void`\>

#### Defined in

[packages/sdk/client/src/packlets/api/client-service.ts:40](https://github.com/dxos/dxos/blob/32ae9b579/packages/sdk/client/src/packlets/api/client-service.ts#L40)

___

### open

▸ **open**(`onProgressCallback?`): `Promise`<`void`\>

#### Parameters

| Name | Type |
| :------ | :------ |
| `onProgressCallback?` | (`progress`: [`OpenProgress`](dxos_client.OpenProgress.md)) => `void` |

#### Returns

`Promise`<`void`\>

#### Defined in

[packages/sdk/client/src/packlets/api/client-service.ts:39](https://github.com/dxos/dxos/blob/32ae9b579/packages/sdk/client/src/packlets/api/client-service.ts#L39)
