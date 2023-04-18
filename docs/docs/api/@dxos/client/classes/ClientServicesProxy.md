# Class `ClientServicesProxy`
<sub>Declared in [packages/sdk/client/src/packlets/client/service-proxy.ts:15](https://github.com/dxos/dxos/blob/main/packages/sdk/client/src/packlets/client/service-proxy.ts#L15)</sub>


Implements services that are not local to the app.
For example, the services can be located in Wallet Extension.


## Constructors
### [constructor(port, _timeout)](https://github.com/dxos/dxos/blob/main/packages/sdk/client/src/packlets/client/service-proxy.ts#L19)



Returns: <code>[ClientServicesProxy](/api/@dxos/client/classes/ClientServicesProxy)</code>

Arguments: 

`port`: <code>RpcPort</code>

`_timeout`: <code>number</code>


## Properties
### [descriptors](https://github.com/dxos/dxos/blob/main/packages/sdk/client/src/packlets/client/service-proxy.ts#L37)
Type: <code>ServiceBundle&lt;[ClientServices](/api/@dxos/client/types/ClientServices)&gt;</code>

### [proxy](https://github.com/dxos/dxos/blob/main/packages/sdk/client/src/packlets/client/service-proxy.ts#L33)
Type: <code>ProtoRpcPeer&lt;[ClientServices](/api/@dxos/client/types/ClientServices)&gt;</code>

### [services](https://github.com/dxos/dxos/blob/main/packages/sdk/client/src/packlets/client/service-proxy.ts#L41)
Type: <code>[ClientServices](/api/@dxos/client/types/ClientServices)</code>


## Methods
### [close()](https://github.com/dxos/dxos/blob/main/packages/sdk/client/src/packlets/client/service-proxy.ts#L53)



Returns: <code>Promise&lt;void&gt;</code>

Arguments: none

### [open()](https://github.com/dxos/dxos/blob/main/packages/sdk/client/src/packlets/client/service-proxy.ts#L45)



Returns: <code>Promise&lt;void&gt;</code>

Arguments: none
