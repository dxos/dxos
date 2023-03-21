# Class `ClientServicesProxy`
<sub>Declared in [packages/sdk/client/src/packlets/client/service-proxy.ts:17](https://github.com/dxos/dxos/blob/main/packages/sdk/client/src/packlets/client/service-proxy.ts#L17)</sub>


Implements services that are not local to the app.
For example, the services can be located in Wallet Extension.


## Constructors
### [constructor(port, _timeout)](https://github.com/dxos/dxos/blob/main/packages/sdk/client/src/packlets/client/service-proxy.ts#L21)



Returns: <code>[ClientServicesProxy](/api/@dxos/client/classes/ClientServicesProxy)</code>

Arguments: 

`port`: <code>RpcPort</code>

`_timeout`: <code>number</code>


## Properties
### [descriptors](https://github.com/dxos/dxos/blob/main/packages/sdk/client/src/packlets/client/service-proxy.ts#L39)
Type: <code>ServiceBundle&lt;[ClientServices](/api/@dxos/client/types/ClientServices)&gt;</code>

### [proxy](https://github.com/dxos/dxos/blob/main/packages/sdk/client/src/packlets/client/service-proxy.ts#L35)
Type: <code>ProtoRpcPeer&lt;[ClientServices](/api/@dxos/client/types/ClientServices)&gt;</code>

### [services](https://github.com/dxos/dxos/blob/main/packages/sdk/client/src/packlets/client/service-proxy.ts#L43)
Type: <code>[ClientServices](/api/@dxos/client/types/ClientServices)</code>


## Methods
### [close()](https://github.com/dxos/dxos/blob/main/packages/sdk/client/src/packlets/client/service-proxy.ts#L51)



Returns: <code>Promise&lt;void&gt;</code>

Arguments: none

### [open()](https://github.com/dxos/dxos/blob/main/packages/sdk/client/src/packlets/client/service-proxy.ts#L47)



Returns: <code>Promise&lt;void&gt;</code>

Arguments: none
