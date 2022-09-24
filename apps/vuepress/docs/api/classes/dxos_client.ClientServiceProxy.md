# Class: ClientServiceProxy

[@dxos/client](../modules/dxos_client.md).ClientServiceProxy

Implements services that are not local to the app.
For example, the services can be located in Wallet Extension.

## Implements

- [`ClientServiceProvider`](../interfaces/dxos_client.ClientServiceProvider.md)

## Table of contents

### Constructors

- [constructor](dxos_client.ClientServiceProxy.md#constructor)

### Properties

- [\_client](dxos_client.ClientServiceProxy.md#_client)
- [services](dxos_client.ClientServiceProxy.md#services)

### Methods

- [close](dxos_client.ClientServiceProxy.md#close)
- [open](dxos_client.ClientServiceProxy.md#open)

## Constructors

### constructor

• **new ClientServiceProxy**(`port`, `_timeout?`)

#### Parameters

| Name | Type | Default value |
| :------ | :------ | :------ |
| `port` | `RpcPort` | `undefined` |
| `_timeout` | `number` | `300` |

#### Defined in

[packages/sdk/client/src/packlets/proxy/service-proxy.ts:18](https://github.com/dxos/dxos/blob/e3b936721/packages/sdk/client/src/packlets/proxy/service-proxy.ts#L18)

## Properties

### \_client

• `Private` `Readonly` **\_client**: `ProtoRpcPeer`<[`ClientServices`](../modules/dxos_client.md#clientservices)\>

#### Defined in

[packages/sdk/client/src/packlets/proxy/service-proxy.ts:16](https://github.com/dxos/dxos/blob/e3b936721/packages/sdk/client/src/packlets/proxy/service-proxy.ts#L16)

___

### services

• `Readonly` **services**: [`ClientServices`](../modules/dxos_client.md#clientservices)

#### Implementation of

[ClientServiceProvider](../interfaces/dxos_client.ClientServiceProvider.md).[services](../interfaces/dxos_client.ClientServiceProvider.md#services)

#### Defined in

[packages/sdk/client/src/packlets/proxy/service-proxy.ts:29](https://github.com/dxos/dxos/blob/e3b936721/packages/sdk/client/src/packlets/proxy/service-proxy.ts#L29)

## Methods

### close

▸ **close**(): `Promise`<`void`\>

#### Returns

`Promise`<`void`\>

#### Implementation of

[ClientServiceProvider](../interfaces/dxos_client.ClientServiceProvider.md).[close](../interfaces/dxos_client.ClientServiceProvider.md#close)

#### Defined in

[packages/sdk/client/src/packlets/proxy/service-proxy.ts:35](https://github.com/dxos/dxos/blob/e3b936721/packages/sdk/client/src/packlets/proxy/service-proxy.ts#L35)

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

[packages/sdk/client/src/packlets/proxy/service-proxy.ts:31](https://github.com/dxos/dxos/blob/e3b936721/packages/sdk/client/src/packlets/proxy/service-proxy.ts#L31)
