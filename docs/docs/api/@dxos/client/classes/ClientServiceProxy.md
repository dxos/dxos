# Class `ClientServiceProxy`
Declared in [`packages/sdk/client/src/packlets/proxies/service-proxy.ts:18`](https://github.com/dxos/protocols/blob/main/packages/sdk/client/src/packlets/proxies/service-proxy.ts#L18)


Implements services that are not local to the app.
For example, the services can be located in Wallet Extension.

## Constructors
### [`constructor`](https://github.com/dxos/protocols/blob/main/packages/sdk/client/src/packlets/proxies/service-proxy.ts#L21)


Returns: [`ClientServiceProxy`](/api/@dxos/client/classes/ClientServiceProxy)

Arguments: 

`port`: `RpcPort`

`_timeout`: `number`

## Properties
### [`services`](https://github.com/dxos/protocols/blob/main/packages/sdk/client/src/packlets/proxies/service-proxy.ts#L32)
Type: [`ClientServices`](/api/@dxos/client/types/ClientServices)

## Methods
### [`close`](https://github.com/dxos/protocols/blob/main/packages/sdk/client/src/packlets/proxies/service-proxy.ts#L38)


Returns: `Promise<void>`

Arguments: none
### [`open`](https://github.com/dxos/protocols/blob/main/packages/sdk/client/src/packlets/proxies/service-proxy.ts#L34)


Returns: `Promise<void>`

Arguments: 

`onProgressCallback`: `function`