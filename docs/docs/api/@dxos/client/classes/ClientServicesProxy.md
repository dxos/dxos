# Class `ClientServicesProxy`
<sub>Declared in [packages/sdk/client/src/packlets/proxies/service-proxy.ts:14](https://github.com/dxos/dxos/blob/main/packages/sdk/client/src/packlets/proxies/service-proxy.ts#L14)</sub>


Implements services that are not local to the app.
For example, the services can be located in Wallet Extension.


## Constructors
### [constructor(port, _timeout)](https://github.com/dxos/dxos/blob/main/packages/sdk/client/src/packlets/proxies/service-proxy.ts#L18)



Returns: <code>[ClientServicesProxy](/api/@dxos/client/classes/ClientServicesProxy)</code>

Arguments: 

`port`: <code>RpcPort</code>

`_timeout`: <code>number</code>


## Properties
### [descriptors](https://github.com/dxos/dxos/blob/main/packages/sdk/client/src/packlets/proxies/service-proxy.ts#L36)
Type: <code>ServiceBundle&lt;[ClientServices](/api/@dxos/client/types/ClientServices)&gt;</code>

### [proxy](https://github.com/dxos/dxos/blob/main/packages/sdk/client/src/packlets/proxies/service-proxy.ts#L32)
Type: <code>ProtoRpcPeer&lt;[ClientServices](/api/@dxos/client/types/ClientServices)&gt;</code>

### [services](https://github.com/dxos/dxos/blob/main/packages/sdk/client/src/packlets/proxies/service-proxy.ts#L40)
Type: <code>[ClientServices](/api/@dxos/client/types/ClientServices)</code>


## Methods
### [close()](https://github.com/dxos/dxos/blob/main/packages/sdk/client/src/packlets/proxies/service-proxy.ts#L52)



Returns: <code>Promise&lt;void&gt;</code>

Arguments: none

### [open()](https://github.com/dxos/dxos/blob/main/packages/sdk/client/src/packlets/proxies/service-proxy.ts#L44)



Returns: <code>Promise&lt;void&gt;</code>

Arguments: none
