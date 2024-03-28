# Class `ClientServicesProxy`
<sub>Declared in [packages/sdk/client/src/services/service-proxy.ts:17](https://github.com/dxos/dxos/blob/29a91026f/packages/sdk/client/src/services/service-proxy.ts#L17)</sub>


Implements services that are not local to the app.
For example, the services can be located in Wallet Extension.

## Constructors
### [constructor(_port, _timeout)](https://github.com/dxos/dxos/blob/29a91026f/packages/sdk/client/src/services/service-proxy.ts#L21)




Returns: <code>[ClientServicesProxy](/api/@dxos/client/classes/ClientServicesProxy)</code>

Arguments: 

`_port`: <code>RpcPort</code>

`_timeout`: <code>number</code>



## Properties
### [closed](https://github.com/dxos/dxos/blob/29a91026f/packages/sdk/client/src/services/service-proxy.ts#L18)
Type: <code>Event&lt;undefined | Error&gt;</code>

The connection to the services provider was termintaed.

This should fire if the services disconnect unexpectedly or during a client reset.

### [descriptors](https://github.com/dxos/dxos/blob/29a91026f/packages/sdk/client/src/services/service-proxy.ts#L33)
Type: <code>ServiceBundle&lt;[ClientServices](/api/@dxos/client/types/ClientServices)&gt;</code>



### [proxy](https://github.com/dxos/dxos/blob/29a91026f/packages/sdk/client/src/services/service-proxy.ts#L28)
Type: <code>ProtoRpcPeer&lt;[ClientServices](/api/@dxos/client/types/ClientServices)&gt;</code>



### [services](https://github.com/dxos/dxos/blob/29a91026f/packages/sdk/client/src/services/service-proxy.ts#L37)
Type: <code>[ClientServices](/api/@dxos/client/types/ClientServices)</code>




## Methods
### [close()](https://github.com/dxos/dxos/blob/29a91026f/packages/sdk/client/src/services/service-proxy.ts#L63)




Returns: <code>Promise&lt;void&gt;</code>

Arguments: none




### [open()](https://github.com/dxos/dxos/blob/29a91026f/packages/sdk/client/src/services/service-proxy.ts#L42)




Returns: <code>Promise&lt;void&gt;</code>

Arguments: none




