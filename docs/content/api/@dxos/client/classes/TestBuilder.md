# Class `TestBuilder`
<sub>Declared in [packages/sdk/client/src/testing/test-builder.ts:52](https://github.com/dxos/dxos/blob/5edae0c63/packages/sdk/client/src/testing/test-builder.ts#L52)</sub>


Client builder supports different configurations, incl. signaling, transports, storage.

## Constructors
### [constructor(\[config\], signalManagerContext, transport)](https://github.com/dxos/dxos/blob/5edae0c63/packages/sdk/client/src/testing/test-builder.ts#L62)




Returns: <code>[TestBuilder](/api/@dxos/client/classes/TestBuilder)</code>

Arguments: 

`config`: <code>[Config](/api/@dxos/client/classes/Config)</code>

`signalManagerContext`: <code>MemorySignalManagerContext</code>

`transport`: <code>TransportKind</code>



## Properties
### [_transport](https://github.com/dxos/dxos/blob/5edae0c63/packages/sdk/client/src/testing/test-builder.ts#L59)
Type: <code>TransportKind</code>



### [config](https://github.com/dxos/dxos/blob/5edae0c63/packages/sdk/client/src/testing/test-builder.ts#L55)
Type: <code>[Config](/api/@dxos/client/classes/Config)</code>



### [level](https://github.com/dxos/dxos/blob/5edae0c63/packages/sdk/client/src/testing/test-builder.ts#L57)
Type: <code>function</code>



### [signalManagerContext](https://github.com/dxos/dxos/blob/5edae0c63/packages/sdk/client/src/testing/test-builder.ts#L64)
Type: <code>MemorySignalManagerContext</code>



### [storage](https://github.com/dxos/dxos/blob/5edae0c63/packages/sdk/client/src/testing/test-builder.ts#L56)
Type: <code>function</code>



### [ctx](https://github.com/dxos/dxos/blob/5edae0c63/packages/sdk/client/src/testing/test-builder.ts#L72)
Type: <code>Context</code>




## Methods
### [createClientServer(host)](https://github.com/dxos/dxos/blob/5edae0c63/packages/sdk/client/src/testing/test-builder.ts#L166)


Create client/server.

Returns: <code>[[Client](/api/@dxos/client/classes/Client), ProtoRpcPeer&lt;object&gt;]</code>

Arguments: 

`host`: <code>ClientServicesHost</code>


### [createClientServicesHost(\[runtimeParams\])](https://github.com/dxos/dxos/blob/5edae0c63/packages/sdk/client/src/testing/test-builder.ts#L128)


Create backend service handlers.

Returns: <code>ClientServicesHost</code>

Arguments: 

`runtimeParams`: <code>ServiceContextRuntimeParams</code>


### [createLocalClientServices(\[options\])](https://github.com/dxos/dxos/blob/5edae0c63/packages/sdk/client/src/testing/test-builder.ts#L145)


Create local services host.

Returns: <code>[LocalClientServices](/api/@dxos/client/classes/LocalClientServices)</code>

Arguments: 

`options`: <code>object</code>


### [destroy()](https://github.com/dxos/dxos/blob/5edae0c63/packages/sdk/client/src/testing/test-builder.ts#L180)




Returns: <code>Promise&lt;void&gt;</code>

Arguments: none




