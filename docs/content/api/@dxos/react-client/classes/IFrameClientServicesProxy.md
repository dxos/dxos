# Class `IFrameClientServicesProxy`
<sub>Declared in [packages/sdk/client/dist/types/src/services/iframe-service-proxy.d.ts:18]()</sub>


Proxy to host client service via iframe.

## Constructors
### [constructor(\[options\])]()




Returns: <code>[IFrameClientServicesProxy](/api/@dxos/react-client/classes/IFrameClientServicesProxy)</code>

Arguments: 

`options`: <code>[IFrameClientServicesProxyOptions](/api/@dxos/react-client/types/IFrameClientServicesProxyOptions)</code>



## Properties
### [closed]()
Type: <code>Event&lt;undefined | Error&gt;</code>

The connection to the services provider was terminated.
This should fire if the services disconnect unexpectedly or during a client reset.

### [descriptors]()
Type: <code>ServiceBundle&lt;[ClientServices](/api/@dxos/react-client/types/ClientServices)&gt;</code>



### [proxy]()
Type: <code>ProtoRpcPeer&lt;[ClientServices](/api/@dxos/react-client/types/ClientServices)&gt;</code>



### [services]()
Type: <code>Partial&lt;[ClientServices](/api/@dxos/react-client/types/ClientServices)&gt;</code>




## Methods
### [close()]()




Returns: <code>Promise&lt;void&gt;</code>

Arguments: none




### [open()]()




Returns: <code>Promise&lt;void&gt;</code>

Arguments: none




