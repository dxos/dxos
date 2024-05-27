# Class `TestBuilder`
<sub>Declared in [packages/sdk/client/src/testing/test-builder.ts:51](https://github.com/dxos/dxos/blob/7194736719/packages/sdk/client/src/testing/test-builder.ts#L51)</sub>


Client builder supports different configurations, incl. signaling, transports, storage.

## Constructors
### [constructor(\[config\], signalManagerContext, transport)](https://github.com/dxos/dxos/blob/7194736719/packages/sdk/client/src/testing/test-builder.ts#L61)




Returns: <code>[TestBuilder](/api/@dxos/client/classes/TestBuilder)</code>

Arguments: 

`config`: <code>[Config](/api/@dxos/client/classes/Config)</code>

`signalManagerContext`: <code>MemorySignalManagerContext</code>

`transport`: <code>TransportKind</code>



## Properties
### [_transport](https://github.com/dxos/dxos/blob/7194736719/packages/sdk/client/src/testing/test-builder.ts#L58)
Type: <code>TransportKind</code>



### [config](https://github.com/dxos/dxos/blob/7194736719/packages/sdk/client/src/testing/test-builder.ts#L54)
Type: <code>[Config](/api/@dxos/client/classes/Config)</code>



### [level](https://github.com/dxos/dxos/blob/7194736719/packages/sdk/client/src/testing/test-builder.ts#L56)
Type: <code>LevelDB</code>



### [signalManagerContext](https://github.com/dxos/dxos/blob/7194736719/packages/sdk/client/src/testing/test-builder.ts#L63)
Type: <code>MemorySignalManagerContext</code>



### [storage](https://github.com/dxos/dxos/blob/7194736719/packages/sdk/client/src/testing/test-builder.ts#L55)
Type: <code>Storage</code>




## Methods
### [createClientServer(host)](https://github.com/dxos/dxos/blob/7194736719/packages/sdk/client/src/testing/test-builder.ts#L150)


Create client/server.

Returns: <code>[[Client](/api/@dxos/client/classes/Client), ProtoRpcPeer&lt;object&gt;]</code>

Arguments: 

`host`: <code>ClientServicesHost</code>


### [createClientServicesHost(\[runtimeParams\])](https://github.com/dxos/dxos/blob/7194736719/packages/sdk/client/src/testing/test-builder.ts#L116)


Create backend service handlers.

Returns: <code>ClientServicesHost</code>

Arguments: 

`runtimeParams`: <code>ServiceContextRuntimeParams</code>


### [createLocal()](https://github.com/dxos/dxos/blob/7194736719/packages/sdk/client/src/testing/test-builder.ts#L133)


Create local services host.

Returns: <code>[LocalClientServices](/api/@dxos/client/classes/LocalClientServices)</code>

Arguments: none




### [destroy()](https://github.com/dxos/dxos/blob/7194736719/packages/sdk/client/src/testing/test-builder.ts#L166)




Returns: <code>Promise&lt;void&gt;</code>

Arguments: none




