# Class `IFrameClientServicesProxy`
<sub>Declared in [packages/sdk/client/src/services/iframe-service-proxy.ts:44](https://github.com/dxos/dxos/blob/8ed3715dc/packages/sdk/client/src/services/iframe-service-proxy.ts#L44)</sub>


Proxy to host client service via iframe.

## Constructors
### [constructor(options)](https://github.com/dxos/dxos/blob/8ed3715dc/packages/sdk/client/src/services/iframe-service-proxy.ts#L65)




Returns: <code>[IFrameClientServicesProxy](/api/@dxos/client/classes/IFrameClientServicesProxy)</code>

Arguments: 

`options`: <code>[IFrameClientServicesProxyOptions](/api/@dxos/client/types/IFrameClientServicesProxyOptions)</code>



## Properties
### [closed](https://github.com/dxos/dxos/blob/8ed3715dc/packages/sdk/client/src/services/iframe-service-proxy.ts#L45)
Type: <code>Event&lt;undefined | Error&gt;</code>

The connection to the services provider was termintaed.

This should fire if the services disconnect unexpectedly or during a client reset.

### [descriptors](https://github.com/dxos/dxos/blob/8ed3715dc/packages/sdk/client/src/services/iframe-service-proxy.ts#L129)
Type: <code>ServiceBundle&lt;[ClientServices](/api/@dxos/client/types/ClientServices)&gt;</code>



### [proxy](https://github.com/dxos/dxos/blob/8ed3715dc/packages/sdk/client/src/services/iframe-service-proxy.ts#L125)
Type: <code>ProtoRpcPeer&lt;[ClientServices](/api/@dxos/client/types/ClientServices)&gt;</code>



### [services](https://github.com/dxos/dxos/blob/8ed3715dc/packages/sdk/client/src/services/iframe-service-proxy.ts#L133)
Type: <code>Partial&lt;[ClientServices](/api/@dxos/client/types/ClientServices)&gt;</code>




## Methods
### [close()](https://github.com/dxos/dxos/blob/8ed3715dc/packages/sdk/client/src/services/iframe-service-proxy.ts#L174)




Returns: <code>Promise&lt;void&gt;</code>

Arguments: none




### [open()](https://github.com/dxos/dxos/blob/8ed3715dc/packages/sdk/client/src/services/iframe-service-proxy.ts#L137)




Returns: <code>Promise&lt;void&gt;</code>

Arguments: none




