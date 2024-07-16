# Class `LocalClientServices`
<sub>Declared in [packages/sdk/client/src/services/local-client-services.ts:95](https://github.com/dxos/dxos/blob/ec4e715a1/packages/sdk/client/src/services/local-client-services.ts#L95)</sub>


Starts a local instance of the service host.

## Constructors
### [constructor(params)](https://github.com/dxos/dxos/blob/ec4e715a1/packages/sdk/client/src/services/local-client-services.ts#L107)




Returns: <code>[LocalClientServices](/api/@dxos/client/classes/LocalClientServices)</code>

Arguments: 

`params`: <code>ClientServicesHostParams</code>



## Properties
### [closed](https://github.com/dxos/dxos/blob/ec4e715a1/packages/sdk/client/src/services/local-client-services.ts#L96)
Type: <code>Event&lt;undefined | Error&gt;</code>

The connection to the services provider was terminated.
This should fire if the services disconnect unexpectedly or during a client reset.

### [signalMetadataTags](https://github.com/dxos/dxos/blob/ec4e715a1/packages/sdk/client/src/services/local-client-services.ts#L100)
Type: <code>any</code>



### [descriptors](https://github.com/dxos/dxos/blob/ec4e715a1/packages/sdk/client/src/services/local-client-services.ts#L125)
Type: <code>ServiceBundle&lt;[ClientServices](/api/@dxos/client/types/ClientServices)&gt;</code>



### [host](https://github.com/dxos/dxos/blob/ec4e715a1/packages/sdk/client/src/services/local-client-services.ts#L133)
Type: <code>undefined | ClientServicesHost</code>



### [services](https://github.com/dxos/dxos/blob/ec4e715a1/packages/sdk/client/src/services/local-client-services.ts#L129)
Type: <code>Partial&lt;[ClientServices](/api/@dxos/client/types/ClientServices)&gt;</code>




## Methods
### [close()](https://github.com/dxos/dxos/blob/ec4e715a1/packages/sdk/client/src/services/local-client-services.ts#L166)




Returns: <code>Promise&lt;void&gt;</code>

Arguments: none




### [open()](https://github.com/dxos/dxos/blob/ec4e715a1/packages/sdk/client/src/services/local-client-services.ts#L138)




Returns: <code>Promise&lt;void&gt;</code>

Arguments: none




