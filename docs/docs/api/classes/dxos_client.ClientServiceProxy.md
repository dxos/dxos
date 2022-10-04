# Class: ClientServiceProxy

[@dxos/client](../modules/dxos_client.md).ClientServiceProxy

Implements services that are not local to the app.
For example, the services can be located in Wallet Extension.

## Implements

- `ClientServiceProvider`

## Constructors

### constructor

**new ClientServiceProxy**(`port`, `_timeout?`)

#### Parameters

| Name | Type | Default value |
| :------ | :------ | :------ |
| `port` | `RpcPort` | `undefined` |
| `_timeout` | `number` | `300` |

#### Defined in

[packages/sdk/client/src/packlets/proxies/service-proxy.ts:16](https://github.com/dxos/dxos/blob/main/packages/sdk/client/src/packlets/proxies/service-proxy.ts#L16)

## Properties

### \_client

 `Private` `Readonly` **\_client**: `ProtoRpcPeer`<`ClientServices`\>

#### Defined in

[packages/sdk/client/src/packlets/proxies/service-proxy.ts:14](https://github.com/dxos/dxos/blob/main/packages/sdk/client/src/packlets/proxies/service-proxy.ts#L14)

___

### services

 `Readonly` **services**: `ClientServices`

#### Implementation of

ClientServiceProvider.services

#### Defined in

[packages/sdk/client/src/packlets/proxies/service-proxy.ts:27](https://github.com/dxos/dxos/blob/main/packages/sdk/client/src/packlets/proxies/service-proxy.ts#L27)

## Methods

### close

**close**(): `Promise`<`void`\>

#### Returns

`Promise`<`void`\>

#### Implementation of

ClientServiceProvider.close

#### Defined in

[packages/sdk/client/src/packlets/proxies/service-proxy.ts:33](https://github.com/dxos/dxos/blob/main/packages/sdk/client/src/packlets/proxies/service-proxy.ts#L33)

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

ClientServiceProvider.open

#### Defined in

[packages/sdk/client/src/packlets/proxies/service-proxy.ts:29](https://github.com/dxos/dxos/blob/main/packages/sdk/client/src/packlets/proxies/service-proxy.ts#L29)
