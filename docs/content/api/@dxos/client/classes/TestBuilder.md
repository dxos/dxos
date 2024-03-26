# Class `TestBuilder`
<sub>Declared in [packages/sdk/client/src/testing/test-builder.ts:50](https://github.com/dxos/dxos/blob/235256b25/packages/sdk/client/src/testing/test-builder.ts#L50)</sub>


Client builder supports different configurations, incl. signaling, transports, storage.

## Constructors
### [constructor(\[config\], _modelFactory, signalManagerContext, transport)](https://github.com/dxos/dxos/blob/235256b25/packages/sdk/client/src/testing/test-builder.ts#L59)




Returns: <code>[TestBuilder](/api/@dxos/client/classes/TestBuilder)</code>

Arguments: 

`config`: <code>[Config](/api/@dxos/react-client/classes/Config)</code>

`_modelFactory`: <code>ModelFactory</code>

`signalManagerContext`: <code>MemorySignalManagerContext</code>

`transport`: <code>TransportKind</code>



## Properties
### [_transport](https://github.com/dxos/dxos/blob/235256b25/packages/sdk/client/src/testing/test-builder.ts#L56)
Type: <code>TransportKind</code>



### [config](https://github.com/dxos/dxos/blob/235256b25/packages/sdk/client/src/testing/test-builder.ts#L53)
Type: <code>[Config](/api/@dxos/react-client/classes/Config)</code>



### [signalManagerContext](https://github.com/dxos/dxos/blob/235256b25/packages/sdk/client/src/testing/test-builder.ts#L62)
Type: <code>MemorySignalManagerContext</code>



### [storage](https://github.com/dxos/dxos/blob/235256b25/packages/sdk/client/src/testing/test-builder.ts#L55)
Type: <code>Storage</code>




## Methods
### [createClientServer(host)](https://github.com/dxos/dxos/blob/235256b25/packages/sdk/client/src/testing/test-builder.ts#L144)


Create client/server.

Returns: <code>[[Client](/api/@dxos/react-client/classes/Client), ProtoRpcPeer&lt;object&gt;]</code>

Arguments: 

`host`: <code>ClientServicesHost</code>


### [createClientServicesHost(\[runtimeParams\])](https://github.com/dxos/dxos/blob/235256b25/packages/sdk/client/src/testing/test-builder.ts#L115)


Create backend service handlers.

Returns: <code>ClientServicesHost</code>

Arguments: 

`runtimeParams`: <code>ServiceContextRuntimeParams</code>


### [createLocal()](https://github.com/dxos/dxos/blob/235256b25/packages/sdk/client/src/testing/test-builder.ts#L130)


Create local services host.

Returns: <code>[LocalClientServices](/api/@dxos/client/classes/LocalClientServices)</code>

Arguments: none




### [destroy()](https://github.com/dxos/dxos/blob/235256b25/packages/sdk/client/src/testing/test-builder.ts#L160)




Returns: <code>void</code>

Arguments: none




