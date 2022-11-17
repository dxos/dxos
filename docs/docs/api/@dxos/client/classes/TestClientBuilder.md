# Class `TestClientBuilder`
Declared in [`packages/sdk/client/src/packlets/testing/test-client-builder.ts:25`](https://github.com/dxos/protocols/blob/main/packages/sdk/client/src/packlets/testing/test-client-builder.ts#L25)




## Constructors
### [`constructor`](https://github.com/dxos/protocols/blob/main/packages/sdk/client/src/packlets/testing/test-client-builder.ts#L29)


Returns: [`TestClientBuilder`](/api/@dxos/client/classes/TestClientBuilder)

Arguments: 

`config`: `Config | Config`

`_modelFactory`: `ModelFactory`

`_signalManagerContext`: `MemorySignalManagerContext`

## Properties
### [`config`](https://github.com/dxos/protocols/blob/main/packages/sdk/client/src/packlets/testing/test-client-builder.ts#L37)
Type: `Config`
### [`networkManager`](https://github.com/dxos/protocols/blob/main/packages/sdk/client/src/packlets/testing/test-client-builder.ts#L44)
Type: `NetworkManager`

Get network manager using local shared memory or remote signal manager.

## Methods
### [`createClientServer`](https://github.com/dxos/protocols/blob/main/packages/sdk/client/src/packlets/testing/test-client-builder.ts#L78)


Create client/server.

Returns: `[`[`Client`](/api/@dxos/client/classes/Client)`, ProtoRpcPeer<object>]`

Arguments: 

`host`: [`ClientServicesHost`](/api/@dxos/client/classes/ClientServicesHost)
### [`createClientServicesHost`](https://github.com/dxos/protocols/blob/main/packages/sdk/client/src/packlets/testing/test-client-builder.ts#L67)


Create backend service handlers.

Returns: [`ClientServicesHost`](/api/@dxos/client/classes/ClientServicesHost)

Arguments: none