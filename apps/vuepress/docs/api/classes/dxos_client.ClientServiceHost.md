# Class: ClientServiceHost

[@dxos/client](../modules/dxos_client.md).ClientServiceHost

Remote service implementation.

## Implements

- [`ClientServiceProvider`](../interfaces/dxos_client.ClientServiceProvider.md)

## Table of contents

### Constructors

- [constructor](dxos_client.ClientServiceHost.md#constructor)

### Properties

- [\_devtoolsEvents](dxos_client.ClientServiceHost.md#_devtoolsevents)
- [\_echo](dxos_client.ClientServiceHost.md#_echo)
- [\_services](dxos_client.ClientServiceHost.md#_services)

### Accessors

- [echo](dxos_client.ClientServiceHost.md#echo)
- [services](dxos_client.ClientServiceHost.md#services)

### Methods

- [\_createDevtoolsService](dxos_client.ClientServiceHost.md#_createdevtoolsservice)
- [close](dxos_client.ClientServiceHost.md#close)
- [open](dxos_client.ClientServiceHost.md#open)

## Constructors

### constructor

• **new ClientServiceHost**(`_config`, `_signer?`)

#### Parameters

| Name | Type |
| :------ | :------ |
| `_config` | `Config` |
| `_signer?` | [`HaloSigner`](../interfaces/dxos_client.HaloSigner.md) |

#### Defined in

[packages/sdk/client/src/packlets/services/service-host.ts:24](https://github.com/dxos/dxos/blob/32ae9b579/packages/sdk/client/src/packlets/services/service-host.ts#L24)

## Properties

### \_devtoolsEvents

• `Private` `Readonly` **\_devtoolsEvents**: [`DevtoolsHostEvents`](dxos_client.DevtoolsHostEvents.md)

#### Defined in

[packages/sdk/client/src/packlets/services/service-host.ts:20](https://github.com/dxos/dxos/blob/32ae9b579/packages/sdk/client/src/packlets/services/service-host.ts#L20)

___

### \_echo

• `Private` `Readonly` **\_echo**: `ECHO`

#### Defined in

[packages/sdk/client/src/packlets/services/service-host.ts:21](https://github.com/dxos/dxos/blob/32ae9b579/packages/sdk/client/src/packlets/services/service-host.ts#L21)

___

### \_services

• `Private` `Readonly` **\_services**: [`ClientServices`](../modules/dxos_client.md#clientservices)

#### Defined in

[packages/sdk/client/src/packlets/services/service-host.ts:22](https://github.com/dxos/dxos/blob/32ae9b579/packages/sdk/client/src/packlets/services/service-host.ts#L22)

## Accessors

### echo

• `get` **echo**(): `ECHO`

#### Returns

`ECHO`

#### Defined in

[packages/sdk/client/src/packlets/services/service-host.ts:64](https://github.com/dxos/dxos/blob/32ae9b579/packages/sdk/client/src/packlets/services/service-host.ts#L64)

___

### services

• `get` **services**(): [`ClientServices`](../modules/dxos_client.md#clientservices)

#### Returns

[`ClientServices`](../modules/dxos_client.md#clientservices)

#### Implementation of

[ClientServiceProvider](../interfaces/dxos_client.ClientServiceProvider.md).[services](../interfaces/dxos_client.ClientServiceProvider.md#services)

#### Defined in

[packages/sdk/client/src/packlets/services/service-host.ts:51](https://github.com/dxos/dxos/blob/32ae9b579/packages/sdk/client/src/packlets/services/service-host.ts#L51)

## Methods

### \_createDevtoolsService

▸ `Private` **_createDevtoolsService**(): `DevtoolsHost`

Returns devtools context.
Used by the DXOS DevTool Extension.

#### Returns

`DevtoolsHost`

#### Defined in

[packages/sdk/client/src/packlets/services/service-host.ts:72](https://github.com/dxos/dxos/blob/32ae9b579/packages/sdk/client/src/packlets/services/service-host.ts#L72)

___

### close

▸ **close**(): `Promise`<`void`\>

#### Returns

`Promise`<`void`\>

#### Implementation of

[ClientServiceProvider](../interfaces/dxos_client.ClientServiceProvider.md).[close](../interfaces/dxos_client.ClientServiceProvider.md#close)

#### Defined in

[packages/sdk/client/src/packlets/services/service-host.ts:60](https://github.com/dxos/dxos/blob/32ae9b579/packages/sdk/client/src/packlets/services/service-host.ts#L60)

___

### open

▸ **open**(`onProgressCallback?`): `Promise`<`void`\>

#### Parameters

| Name | Type |
| :------ | :------ |
| `onProgressCallback?` | (`progress`: [`OpenProgress`](../interfaces/dxos_client.OpenProgress.md)) => `void` |

#### Returns

`Promise`<`void`\>

#### Implementation of

[ClientServiceProvider](../interfaces/dxos_client.ClientServiceProvider.md).[open](../interfaces/dxos_client.ClientServiceProvider.md#open)

#### Defined in

[packages/sdk/client/src/packlets/services/service-host.ts:55](https://github.com/dxos/dxos/blob/32ae9b579/packages/sdk/client/src/packlets/services/service-host.ts#L55)
