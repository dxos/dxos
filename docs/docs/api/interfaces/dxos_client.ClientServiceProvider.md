# Interface: ClientServiceProvider

[@dxos/client](../modules/dxos_client.md).ClientServiceProvider

## Implemented by

- [`ClientServiceHost`](../classes/dxos_client.ClientServiceHost.md)
- [`ClientServiceProxy`](../classes/dxos_client.ClientServiceProxy.md)

## Properties

### services

 **services**: [`ClientServices`](../types/dxos_client.ClientServices.md)

#### Defined in

[packages/sdk/client/src/packlets/api/client-service.ts:38](https://github.com/dxos/dxos/blob/main/packages/sdk/client/src/packlets/api/client-service.ts#L38)

## Methods

### close

**close**(): `Promise`<`void`\>

#### Returns

`Promise`<`void`\>

#### Defined in

[packages/sdk/client/src/packlets/api/client-service.ts:40](https://github.com/dxos/dxos/blob/main/packages/sdk/client/src/packlets/api/client-service.ts#L40)

___

### open

**open**(`onProgressCallback?`): `Promise`<`void`\>

#### Parameters

| Name | Type |
| :------ | :------ |
| `onProgressCallback?` | (`progress`: [`OpenProgress`](dxos_client.OpenProgress.md)) => `void` |

#### Returns

`Promise`<`void`\>

#### Defined in

[packages/sdk/client/src/packlets/api/client-service.ts:39](https://github.com/dxos/dxos/blob/main/packages/sdk/client/src/packlets/api/client-service.ts#L39)
