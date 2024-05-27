# Class `LocalClientServices`
<sub>Declared in [packages/sdk/client/src/services/local-client-services.ts:89](https://github.com/dxos/dxos/blob/7194736719/packages/sdk/client/src/services/local-client-services.ts#L89)</sub>


Starts a local instance of the service host.

## Constructors
### [constructor(params)](https://github.com/dxos/dxos/blob/7194736719/packages/sdk/client/src/services/local-client-services.ts#L101)




Returns: <code>[LocalClientServices](/api/@dxos/client/classes/LocalClientServices)</code>

Arguments: 

`params`: <code>ClientServicesHostParams</code>



## Properties
### [closed](https://github.com/dxos/dxos/blob/7194736719/packages/sdk/client/src/services/local-client-services.ts#L90)
Type: <code>Event&lt;undefined | Error&gt;</code>

The connection to the services provider was termintaed.

This should fire if the services disconnect unexpectedly or during a client reset.

### [signalMetadataTags](https://github.com/dxos/dxos/blob/7194736719/packages/sdk/client/src/services/local-client-services.ts#L94)
Type: <code>any</code>



### [descriptors](https://github.com/dxos/dxos/blob/7194736719/packages/sdk/client/src/services/local-client-services.ts#L119)
Type: <code>ServiceBundle&lt;[ClientServices](/api/@dxos/client/types/ClientServices)&gt;</code>



### [host](https://github.com/dxos/dxos/blob/7194736719/packages/sdk/client/src/services/local-client-services.ts#L127)
Type: <code>undefined | ClientServicesHost</code>



### [services](https://github.com/dxos/dxos/blob/7194736719/packages/sdk/client/src/services/local-client-services.ts#L123)
Type: <code>Partial&lt;[ClientServices](/api/@dxos/client/types/ClientServices)&gt;</code>




## Methods
### [close()](https://github.com/dxos/dxos/blob/7194736719/packages/sdk/client/src/services/local-client-services.ts#L160)




Returns: <code>Promise&lt;void&gt;</code>

Arguments: none




### [open()](https://github.com/dxos/dxos/blob/7194736719/packages/sdk/client/src/services/local-client-services.ts#L132)




Returns: <code>Promise&lt;void&gt;</code>

Arguments: none




