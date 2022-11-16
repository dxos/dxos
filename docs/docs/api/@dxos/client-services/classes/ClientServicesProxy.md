# Class `ClientServicesProxy`
Declared in [`packages/sdk/client-services/src/packlets/services/service-proxy.ts:17`](https://github.com/dxos/protocols/blob/main/packages/sdk/client-services/src/packlets/services/service-proxy.ts#L17)


Implements services that are not local to the app.
For example, the services can be located in Wallet Extension.

## Constructors
### [`constructor`](https://github.com/dxos/protocols/blob/main/packages/sdk/client-services/src/packlets/services/service-proxy.ts#L21)


Returns: [`ClientServicesProxy`](/api/@dxos/client-services/classes/ClientServicesProxy)

Arguments: 

`port`: `RpcPort`

`_timeout`: `number`

## Properties
### [`descriptors`](https://github.com/dxos/protocols/blob/main/packages/sdk/client-services/src/packlets/services/service-proxy.ts#L39)
Type: `ServiceBundle<`[`ClientServices`](/api/@dxos/client-services/types/ClientServices)`>`
### [`proxy`](https://github.com/dxos/protocols/blob/main/packages/sdk/client-services/src/packlets/services/service-proxy.ts#L35)
Type: `ProtoRpcPeer<`[`ClientServices`](/api/@dxos/client-services/types/ClientServices)`>`
### [`services`](https://github.com/dxos/protocols/blob/main/packages/sdk/client-services/src/packlets/services/service-proxy.ts#L43)
Type: [`ClientServices`](/api/@dxos/client-services/types/ClientServices)

## Methods
### [`close`](https://github.com/dxos/protocols/blob/main/packages/sdk/client-services/src/packlets/services/service-proxy.ts#L51)


Returns: `Promise<void>`

Arguments: none
### [`open`](https://github.com/dxos/protocols/blob/main/packages/sdk/client-services/src/packlets/services/service-proxy.ts#L47)


Returns: `Promise<void>`

Arguments: none