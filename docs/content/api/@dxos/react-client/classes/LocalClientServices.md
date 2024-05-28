# Class `LocalClientServices`
<sub>Declared in [packages/sdk/client/dist/types/src/services/local-client-services.d.ts:13]()</sub>


Starts a local instance of the service host.

## Constructors
### [constructor(params)]()




Returns: <code>[LocalClientServices](/api/@dxos/react-client/classes/LocalClientServices)</code>

Arguments: 

`params`: <code>ClientServicesHostParams</code>



## Properties
### [closed]()
Type: <code>Event&lt;undefined | Error&gt;</code>

The connection to the services provider was terminated.
This should fire if the services disconnect unexpectedly or during a client reset.

### [signalMetadataTags]()
Type: <code>any</code>



### [descriptors]()
Type: <code>ServiceBundle&lt;[ClientServices](/api/@dxos/react-client/types/ClientServices)&gt;</code>



### [host]()
Type: <code>undefined | ClientServicesHost</code>



### [services]()
Type: <code>Partial&lt;[ClientServices](/api/@dxos/react-client/types/ClientServices)&gt;</code>




## Methods
### [close()]()




Returns: <code>Promise&lt;void&gt;</code>

Arguments: none




### [open()]()




Returns: <code>Promise&lt;void&gt;</code>

Arguments: none




