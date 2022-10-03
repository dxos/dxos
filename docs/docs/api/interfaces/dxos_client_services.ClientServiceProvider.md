# Interface: ClientServiceProvider

[@dxos/client-services](../modules/dxos_client_services.md).ClientServiceProvider

## Implemented by

- [`ClientServiceHost`](../classes/dxos_client_services.ClientServiceHost.md)

## Properties

### services

 **services**: [`ClientServices`](../types/dxos_client_services.ClientServices.md)

#### Defined in

[packages/sdk/client-services/src/packlets/services/services.ts:36](https://github.com/dxos/dxos/blob/main/packages/sdk/client-services/src/packlets/services/services.ts#L36)

## Methods

### close

**close**(): `Promise`<`void`\>

#### Returns

`Promise`<`void`\>

#### Defined in

[packages/sdk/client-services/src/packlets/services/services.ts:38](https://github.com/dxos/dxos/blob/main/packages/sdk/client-services/src/packlets/services/services.ts#L38)

___

### open

**open**(`onProgressCallback?`): `Promise`<`void`\>

#### Parameters

| Name | Type |
| :------ | :------ |
| `onProgressCallback?` | (`progress`: `any`) => `void` |

#### Returns

`Promise`<`void`\>

#### Defined in

[packages/sdk/client-services/src/packlets/services/services.ts:37](https://github.com/dxos/dxos/blob/main/packages/sdk/client-services/src/packlets/services/services.ts#L37)
