# Class `IFrameClientServicesProxy`
<sub>Declared in [packages/sdk/client/dist/types/src/services/iframe-service-proxy.d.ts:17]()</sub>


Proxy to host client service via iframe.

## Constructors
### [constructor(\[options\])]()




Returns: <code>[IFrameClientServicesProxy](/api/@dxos/react-client/classes/IFrameClientServicesProxy)</code>

Arguments: 

`options`: <code>[IFrameClientServicesProxyOptions](/api/@dxos/react-client/types/IFrameClientServicesProxyOptions)</code>



## Properties
### [joinedSpace]()
Type: <code>Event&lt;[PublicKey](/api/@dxos/react-client/classes/PublicKey)&gt;</code>



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




