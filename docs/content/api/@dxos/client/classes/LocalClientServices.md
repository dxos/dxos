# Class `LocalClientServices`
<sub>Declared in [packages/sdk/client/src/services/local-client-services.ts:100](https://github.com/dxos/dxos/blob/88f322397/packages/sdk/client/src/services/local-client-services.ts#L100)</sub>


Starts a local instance of the service host.

## Constructors
### [constructor(params)](https://github.com/dxos/dxos/blob/88f322397/packages/sdk/client/src/services/local-client-services.ts#L112)




Returns: <code>[LocalClientServices](/api/@dxos/client/classes/LocalClientServices)</code>

Arguments: 

`params`: <code>ClientServicesHostParams</code>



## Properties
### [closed](https://github.com/dxos/dxos/blob/88f322397/packages/sdk/client/src/services/local-client-services.ts#L101)
Type: <code>Event&lt;undefined | Error&gt;</code>

The connection to the services provider was terminated.
This should fire if the services disconnect unexpectedly or during a client reset.

### [signalMetadataTags](https://github.com/dxos/dxos/blob/88f322397/packages/sdk/client/src/services/local-client-services.ts#L105)
Type: <code>any</code>



### [descriptors](https://github.com/dxos/dxos/blob/88f322397/packages/sdk/client/src/services/local-client-services.ts#L130)
Type: <code>ServiceBundle&lt;[ClientServices](/api/@dxos/client/types/ClientServices)&gt;</code>



### [host](https://github.com/dxos/dxos/blob/88f322397/packages/sdk/client/src/services/local-client-services.ts#L138)
Type: <code>undefined | ClientServicesHost</code>



### [services](https://github.com/dxos/dxos/blob/88f322397/packages/sdk/client/src/services/local-client-services.ts#L134)
Type: <code>Partial&lt;[ClientServices](/api/@dxos/client/types/ClientServices)&gt;</code>




## Methods
### [close()](https://github.com/dxos/dxos/blob/88f322397/packages/sdk/client/src/services/local-client-services.ts#L173)




Returns: <code>Promise&lt;void&gt;</code>

Arguments: none




### [open()](https://github.com/dxos/dxos/blob/88f322397/packages/sdk/client/src/services/local-client-services.ts#L143)




Returns: <code>Promise&lt;void&gt;</code>

Arguments: none




