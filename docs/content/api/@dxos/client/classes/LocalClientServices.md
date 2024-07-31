# Class `LocalClientServices`
<sub>Declared in [packages/sdk/client/src/services/local-client-services.ts:93](https://github.com/dxos/dxos/blob/ee0bfefcb/packages/sdk/client/src/services/local-client-services.ts#L93)</sub>


Starts a local instance of the service host.

## Constructors
### [constructor(params)](https://github.com/dxos/dxos/blob/ee0bfefcb/packages/sdk/client/src/services/local-client-services.ts#L105)




Returns: <code>[LocalClientServices](/api/@dxos/client/classes/LocalClientServices)</code>

Arguments: 

`params`: <code>ClientServicesHostParams</code>



## Properties
### [closed](https://github.com/dxos/dxos/blob/ee0bfefcb/packages/sdk/client/src/services/local-client-services.ts#L94)
Type: <code>Event&lt;undefined | Error&gt;</code>

The connection to the services provider was terminated.
This should fire if the services disconnect unexpectedly or during a client reset.

### [signalMetadataTags](https://github.com/dxos/dxos/blob/ee0bfefcb/packages/sdk/client/src/services/local-client-services.ts#L98)
Type: <code>any</code>



### [descriptors](https://github.com/dxos/dxos/blob/ee0bfefcb/packages/sdk/client/src/services/local-client-services.ts#L123)
Type: <code>ServiceBundle&lt;[ClientServices](/api/@dxos/client/types/ClientServices)&gt;</code>



### [host](https://github.com/dxos/dxos/blob/ee0bfefcb/packages/sdk/client/src/services/local-client-services.ts#L131)
Type: <code>undefined | ClientServicesHost</code>



### [services](https://github.com/dxos/dxos/blob/ee0bfefcb/packages/sdk/client/src/services/local-client-services.ts#L127)
Type: <code>Partial&lt;[ClientServices](/api/@dxos/client/types/ClientServices)&gt;</code>




## Methods
### [close()](https://github.com/dxos/dxos/blob/ee0bfefcb/packages/sdk/client/src/services/local-client-services.ts#L166)




Returns: <code>Promise&lt;void&gt;</code>

Arguments: none




### [open()](https://github.com/dxos/dxos/blob/ee0bfefcb/packages/sdk/client/src/services/local-client-services.ts#L136)




Returns: <code>Promise&lt;void&gt;</code>

Arguments: none




