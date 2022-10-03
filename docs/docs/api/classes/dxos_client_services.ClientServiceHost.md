# Class: ClientServiceHost

[@dxos/client-services](../modules/dxos_client_services.md).ClientServiceHost

Remote service implementation.

## Implements

- [`ClientServiceProvider`](../interfaces/dxos_client_services.ClientServiceProvider.md)

## Constructors

### constructor

**new ClientServiceHost**(`_config`, `_signer?`)

#### Parameters

| Name | Type |
| :------ | :------ |
| `_config` | `Config` |
| `_signer?` | [`HaloSigner`](../interfaces/dxos_client_services.HaloSigner.md) |

#### Defined in

[packages/sdk/client-services/src/packlets/services/service-host.ts:28](https://github.com/dxos/dxos/blob/main/packages/sdk/client-services/src/packlets/services/service-host.ts#L28)

## Properties

### \_context

 `Private` `Readonly` **\_context**: [`ServiceContext`](dxos_client_services.ServiceContext.md)

#### Defined in

[packages/sdk/client-services/src/packlets/services/service-host.ts:25](https://github.com/dxos/dxos/blob/main/packages/sdk/client-services/src/packlets/services/service-host.ts#L25)

___

### \_services

 `Private` `Readonly` **\_services**: [`ClientServices`](../types/dxos_client_services.ClientServices.md)

#### Defined in

[packages/sdk/client-services/src/packlets/services/service-host.ts:26](https://github.com/dxos/dxos/blob/main/packages/sdk/client-services/src/packlets/services/service-host.ts#L26)

## Accessors

### echo

`get` **echo**(): `never`

#### Returns

`never`

#### Defined in

[packages/sdk/client-services/src/packlets/services/service-host.ts:70](https://github.com/dxos/dxos/blob/main/packages/sdk/client-services/src/packlets/services/service-host.ts#L70)

___

### services

`get` **services**(): [`ClientServices`](../types/dxos_client_services.ClientServices.md)

#### Returns

[`ClientServices`](../types/dxos_client_services.ClientServices.md)

#### Implementation of

[ClientServiceProvider](../interfaces/dxos_client_services.ClientServiceProvider.md).[services](../interfaces/dxos_client_services.ClientServiceProvider.md#services)

#### Defined in

[packages/sdk/client-services/src/packlets/services/service-host.ts:56](https://github.com/dxos/dxos/blob/main/packages/sdk/client-services/src/packlets/services/service-host.ts#L56)

## Methods

### \_createDevtoolsService

`Private` **_createDevtoolsService**(): `DevtoolsHost`

Returns devtools context.
Used by the DXOS DevTool Extension.

#### Returns

`DevtoolsHost`

#### Defined in

[packages/sdk/client-services/src/packlets/services/service-host.ts:78](https://github.com/dxos/dxos/blob/main/packages/sdk/client-services/src/packlets/services/service-host.ts#L78)

___

### close

**close**(): `Promise`<`void`\>

#### Returns

`Promise`<`void`\>

#### Implementation of

[ClientServiceProvider](../interfaces/dxos_client_services.ClientServiceProvider.md).[close](../interfaces/dxos_client_services.ClientServiceProvider.md#close)

#### Defined in

[packages/sdk/client-services/src/packlets/services/service-host.ts:66](https://github.com/dxos/dxos/blob/main/packages/sdk/client-services/src/packlets/services/service-host.ts#L66)

___

### open

**open**(`onProgressCallback?`): `Promise`<`void`\>

#### Parameters

| Name | Type |
| :------ | :------ |
| `onProgressCallback?` | (`progress`: `any`) => `void` |

#### Returns

`Promise`<`void`\>

#### Implementation of

[ClientServiceProvider](../interfaces/dxos_client_services.ClientServiceProvider.md).[open](../interfaces/dxos_client_services.ClientServiceProvider.md#open)

#### Defined in

[packages/sdk/client-services/src/packlets/services/service-host.ts:61](https://github.com/dxos/dxos/blob/main/packages/sdk/client-services/src/packlets/services/service-host.ts#L61)
