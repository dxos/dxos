# Class `TestClientBuilder`
<sub>Declared in [packages/sdk/client/src/packlets/testing/test-client-builder.ts:25](https://github.com/dxos/protocols/blob/main/packages/sdk/client/src/packlets/testing/test-client-builder.ts#L25)</sub>




## Constructors
### [constructor(\[config\], _modelFactory, _signalManagerContext)](https://github.com/dxos/protocols/blob/main/packages/sdk/client/src/packlets/testing/test-client-builder.ts#L29)


Returns: <code>[TestClientBuilder](/api/@dxos/client/classes/TestClientBuilder)</code>

Arguments: 

`config`: <code>[Config](/api/@dxos/client/classes/Config)</code>

`_modelFactory`: <code>ModelFactory</code>

`_signalManagerContext`: <code>MemorySignalManagerContext</code>

## Properties
### [config](https://github.com/dxos/protocols/blob/main/packages/sdk/client/src/packlets/testing/test-client-builder.ts#L37)
Type: <code>[Config](/api/@dxos/client/classes/Config)</code>
### [networkManager](https://github.com/dxos/protocols/blob/main/packages/sdk/client/src/packlets/testing/test-client-builder.ts#L44)
Type: <code>NetworkManager</code>

Get network manager using local shared memory or remote signal manager.

## Methods
### [createClientServer(host)](https://github.com/dxos/protocols/blob/main/packages/sdk/client/src/packlets/testing/test-client-builder.ts#L78)


Create client/server.

Returns: <code>[[Client](/api/@dxos/client/classes/Client), ProtoRpcPeer&lt;object&gt;]</code>

Arguments: 

`host`: <code>[ClientServicesHost](/api/@dxos/client/classes/ClientServicesHost)</code>
### [createClientServicesHost()](https://github.com/dxos/protocols/blob/main/packages/sdk/client/src/packlets/testing/test-client-builder.ts#L67)


Create backend service handlers.

Returns: <code>[ClientServicesHost](/api/@dxos/client/classes/ClientServicesHost)</code>

Arguments: none