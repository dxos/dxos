# Class `ClientServicesProxy`
<sub>Declared in [packages/sdk/client/dist/types/src/services/service-proxy.d.ts:8]()</sub>


Implements services that are not local to the app.
For example, the services can be located in Wallet Extension.

## Constructors
### [constructor(_port, \[_timeout\])]()




Returns: <code>[ClientServicesProxy](/api/@dxos/react-client/classes/ClientServicesProxy)</code>

Arguments: 

`_port`: <code>RpcPort</code>

`_timeout`: <code>number</code>



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
Type: <code>[ClientServices](/api/@dxos/react-client/types/ClientServices)</code>




## Methods
### [close()]()




Returns: <code>Promise&lt;void&gt;</code>

Arguments: none




### [open()]()




Returns: <code>Promise&lt;void&gt;</code>

Arguments: none




