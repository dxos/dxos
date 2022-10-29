# Class `ClientServiceProxy`
Declared in [`packages/sdk/client/src/packlets/proxies/service-proxy.ts:13`](https://github.com/dxos/protocols/blob/main/packages/sdk/client/src/packlets/proxies/service-proxy.ts#L13)


Implements services that are not local to the app.
For example, the services can be located in Wallet Extension.

## Constructors
### [`constructor`](https://github.com/dxos/protocols/blob/main/packages/sdk/client/src/packlets/proxies/service-proxy.ts#L16)


Returns: [`ClientServiceProxy`](/api/@dxos/client/classes/ClientServiceProxy)

Arguments: 

`port`: `RpcPort`

`_timeout`: `number`

## Properties
### [`services`](https://github.com/dxos/protocols/blob/main/packages/sdk/client/src/packlets/proxies/service-proxy.ts#L27)
Type: `ClientServices`

## Methods
### [`close`](https://github.com/dxos/protocols/blob/main/packages/sdk/client/src/packlets/proxies/service-proxy.ts#L33)


Returns: `Promise<void>`

Arguments: none
### [`open`](https://github.com/dxos/protocols/blob/main/packages/sdk/client/src/packlets/proxies/service-proxy.ts#L29)


Returns: `Promise<void>`

Arguments: 

`onProgressCallback`: `function`