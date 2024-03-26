# Class `LocalClientServices`
<sub>Declared in [packages/sdk/client/src/services/local-client-services.ts:71](https://github.com/dxos/dxos/blob/235256b25/packages/sdk/client/src/services/local-client-services.ts#L71)</sub>


Starts a local instance of the service host.

## Constructors
### [constructor(params)](https://github.com/dxos/dxos/blob/235256b25/packages/sdk/client/src/services/local-client-services.ts#L80)




Returns: <code>[LocalClientServices](/api/@dxos/client/classes/LocalClientServices)</code>

Arguments: 

`params`: <code>ClientServicesHostParams</code>



## Properties
### [closed](https://github.com/dxos/dxos/blob/235256b25/packages/sdk/client/src/services/local-client-services.ts#L72)
Type: <code>Event&lt;undefined | Error&gt;</code>

The connection to the services provider was termintaed.

This should fire if the services disconnect unexpectedly or during a client reset.

### [descriptors](https://github.com/dxos/dxos/blob/235256b25/packages/sdk/client/src/services/local-client-services.ts#L84)
Type: <code>ServiceBundle&lt;[ClientServices](/api/@dxos/client/types/ClientServices)&gt;</code>



### [host](https://github.com/dxos/dxos/blob/235256b25/packages/sdk/client/src/services/local-client-services.ts#L92)
Type: <code>undefined | ClientServicesHost</code>



### [services](https://github.com/dxos/dxos/blob/235256b25/packages/sdk/client/src/services/local-client-services.ts#L88)
Type: <code>Partial&lt;[ClientServices](/api/@dxos/client/types/ClientServices)&gt;</code>




## Methods
### [close()](https://github.com/dxos/dxos/blob/235256b25/packages/sdk/client/src/services/local-client-services.ts#L118)




Returns: <code>Promise&lt;void&gt;</code>

Arguments: none




### [open()](https://github.com/dxos/dxos/blob/235256b25/packages/sdk/client/src/services/local-client-services.ts#L97)




Returns: <code>Promise&lt;void&gt;</code>

Arguments: none




