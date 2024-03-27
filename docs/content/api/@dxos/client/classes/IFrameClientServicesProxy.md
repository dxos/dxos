# Class `IFrameClientServicesProxy`
<sub>Declared in [packages/sdk/client/src/services/iframe-service-proxy.ts:43](https://github.com/dxos/dxos/blob/29a91026f/packages/sdk/client/src/services/iframe-service-proxy.ts#L43)</sub>


Proxy to host client service via iframe.

## Constructors
### [constructor(options)](https://github.com/dxos/dxos/blob/29a91026f/packages/sdk/client/src/services/iframe-service-proxy.ts#L64)




Returns: <code>[IFrameClientServicesProxy](/api/@dxos/client/classes/IFrameClientServicesProxy)</code>

Arguments: 

`options`: <code>[IFrameClientServicesProxyOptions](/api/@dxos/client/types/IFrameClientServicesProxyOptions)</code>



## Properties
### [closed](https://github.com/dxos/dxos/blob/29a91026f/packages/sdk/client/src/services/iframe-service-proxy.ts#L44)
Type: <code>Event&lt;undefined | Error&gt;</code>

The connection to the services provider was termintaed.

This should fire if the services disconnect unexpectedly or during a client reset.

### [descriptors](https://github.com/dxos/dxos/blob/29a91026f/packages/sdk/client/src/services/iframe-service-proxy.ts#L128)
Type: <code>ServiceBundle&lt;[ClientServices](/api/@dxos/client/types/ClientServices)&gt;</code>



### [proxy](https://github.com/dxos/dxos/blob/29a91026f/packages/sdk/client/src/services/iframe-service-proxy.ts#L124)
Type: <code>ProtoRpcPeer&lt;[ClientServices](/api/@dxos/client/types/ClientServices)&gt;</code>



### [services](https://github.com/dxos/dxos/blob/29a91026f/packages/sdk/client/src/services/iframe-service-proxy.ts#L132)
Type: <code>Partial&lt;[ClientServices](/api/@dxos/client/types/ClientServices)&gt;</code>




## Methods
### [close()](https://github.com/dxos/dxos/blob/29a91026f/packages/sdk/client/src/services/iframe-service-proxy.ts#L170)




Returns: <code>Promise&lt;void&gt;</code>

Arguments: none




### [open()](https://github.com/dxos/dxos/blob/29a91026f/packages/sdk/client/src/services/iframe-service-proxy.ts#L136)




Returns: <code>Promise&lt;void&gt;</code>

Arguments: none




