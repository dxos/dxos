# Class `LocalClientServices`
<sub>Declared in [packages/sdk/client/src/services/local-client-services.ts:91](https://github.com/dxos/dxos/blob/3ca6d230f/packages/sdk/client/src/services/local-client-services.ts#L91)</sub>


Starts a local instance of the service host.

## Constructors
### [constructor(params)](https://github.com/dxos/dxos/blob/3ca6d230f/packages/sdk/client/src/services/local-client-services.ts#L103)




Returns: <code>[LocalClientServices](/api/@dxos/client/classes/LocalClientServices)</code>

Arguments: 

`params`: <code>ClientServicesHostParams</code>



## Properties
### [closed](https://github.com/dxos/dxos/blob/3ca6d230f/packages/sdk/client/src/services/local-client-services.ts#L92)
Type: <code>Event&lt;undefined | Error&gt;</code>

The connection to the services provider was terminated.
This should fire if the services disconnect unexpectedly or during a client reset.

### [signalMetadataTags](https://github.com/dxos/dxos/blob/3ca6d230f/packages/sdk/client/src/services/local-client-services.ts#L96)
Type: <code>any</code>



### [descriptors](https://github.com/dxos/dxos/blob/3ca6d230f/packages/sdk/client/src/services/local-client-services.ts#L121)
Type: <code>ServiceBundle&lt;[ClientServices](/api/@dxos/client/types/ClientServices)&gt;</code>



### [host](https://github.com/dxos/dxos/blob/3ca6d230f/packages/sdk/client/src/services/local-client-services.ts#L129)
Type: <code>undefined | ClientServicesHost</code>



### [services](https://github.com/dxos/dxos/blob/3ca6d230f/packages/sdk/client/src/services/local-client-services.ts#L125)
Type: <code>Partial&lt;[ClientServices](/api/@dxos/client/types/ClientServices)&gt;</code>




## Methods
### [close()](https://github.com/dxos/dxos/blob/3ca6d230f/packages/sdk/client/src/services/local-client-services.ts#L162)




Returns: <code>Promise&lt;void&gt;</code>

Arguments: none




### [open()](https://github.com/dxos/dxos/blob/3ca6d230f/packages/sdk/client/src/services/local-client-services.ts#L134)




Returns: <code>Promise&lt;void&gt;</code>

Arguments: none




