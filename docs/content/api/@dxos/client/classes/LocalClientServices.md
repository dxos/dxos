# Class `LocalClientServices`
<sub>Declared in [packages/sdk/client/src/services/local-client-services.ts:68](https://github.com/dxos/dxos/blob/bfdd5a17b/packages/sdk/client/src/services/local-client-services.ts#L68)</sub>


Starts a local instance of the service host.

## Constructors
### [constructor(params)](https://github.com/dxos/dxos/blob/bfdd5a17b/packages/sdk/client/src/services/local-client-services.ts#L77)




Returns: <code>[LocalClientServices](/api/@dxos/client/classes/LocalClientServices)</code>

Arguments: 

`params`: <code>ClientServicesHostParams</code>



## Properties
### [closed](https://github.com/dxos/dxos/blob/bfdd5a17b/packages/sdk/client/src/services/local-client-services.ts#L69)
Type: <code>Event&lt;undefined | Error&gt;</code>

The connection to the services provider was termintaed.

This should fire if the services disconnect unexpectedly or during a client reset.

### [descriptors](https://github.com/dxos/dxos/blob/bfdd5a17b/packages/sdk/client/src/services/local-client-services.ts#L81)
Type: <code>ServiceBundle&lt;[ClientServices](/api/@dxos/client/types/ClientServices)&gt;</code>



### [host](https://github.com/dxos/dxos/blob/bfdd5a17b/packages/sdk/client/src/services/local-client-services.ts#L89)
Type: <code>undefined | ClientServicesHost</code>



### [services](https://github.com/dxos/dxos/blob/bfdd5a17b/packages/sdk/client/src/services/local-client-services.ts#L85)
Type: <code>Partial&lt;[ClientServices](/api/@dxos/client/types/ClientServices)&gt;</code>




## Methods
### [close()](https://github.com/dxos/dxos/blob/bfdd5a17b/packages/sdk/client/src/services/local-client-services.ts#L115)




Returns: <code>Promise&lt;void&gt;</code>

Arguments: none




### [open()](https://github.com/dxos/dxos/blob/bfdd5a17b/packages/sdk/client/src/services/local-client-services.ts#L94)




Returns: <code>Promise&lt;void&gt;</code>

Arguments: none




