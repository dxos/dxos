# Class `ClientServicesProxy`
<sub>Declared in [packages/sdk/client/src/services/service-proxy.ts:18](https://github.com/dxos/dxos/blob/3ca6d230f/packages/sdk/client/src/services/service-proxy.ts#L18)</sub>


Implements services that are not local to the app.
For example, the services can be located in Wallet Extension.

## Constructors
### [constructor(_port, _timeout)](https://github.com/dxos/dxos/blob/3ca6d230f/packages/sdk/client/src/services/service-proxy.ts#L22)




Returns: <code>[ClientServicesProxy](/api/@dxos/client/classes/ClientServicesProxy)</code>

Arguments: 

`_port`: <code>RpcPort</code>

`_timeout`: <code>number</code>



## Properties
### [closed](https://github.com/dxos/dxos/blob/3ca6d230f/packages/sdk/client/src/services/service-proxy.ts#L19)
Type: <code>Event&lt;undefined | Error&gt;</code>

The connection to the services provider was terminated.
This should fire if the services disconnect unexpectedly or during a client reset.

### [descriptors](https://github.com/dxos/dxos/blob/3ca6d230f/packages/sdk/client/src/services/service-proxy.ts#L34)
Type: <code>ServiceBundle&lt;[ClientServices](/api/@dxos/client/types/ClientServices)&gt;</code>



### [proxy](https://github.com/dxos/dxos/blob/3ca6d230f/packages/sdk/client/src/services/service-proxy.ts#L29)
Type: <code>ProtoRpcPeer&lt;[ClientServices](/api/@dxos/client/types/ClientServices)&gt;</code>



### [services](https://github.com/dxos/dxos/blob/3ca6d230f/packages/sdk/client/src/services/service-proxy.ts#L38)
Type: <code>[ClientServices](/api/@dxos/client/types/ClientServices)</code>




## Methods
### [close()](https://github.com/dxos/dxos/blob/3ca6d230f/packages/sdk/client/src/services/service-proxy.ts#L64)




Returns: <code>Promise&lt;void&gt;</code>

Arguments: none




### [open()](https://github.com/dxos/dxos/blob/3ca6d230f/packages/sdk/client/src/services/service-proxy.ts#L43)




Returns: <code>Promise&lt;void&gt;</code>

Arguments: none




