# Class `IFrameClientServicesHost`
<sub>Declared in [packages/sdk/client/dist/types/src/services/iframe-service-host.d.ts:16]()</sub>


Proxy to host client service via iframe.

## Constructors
### [constructor(options)]()




Returns: <code>[IFrameClientServicesHost](/api/@dxos/react-client/classes/IFrameClientServicesHost)</code>

Arguments: 

`options`: <code>[IFrameClientServicesHostOptions](/api/@dxos/react-client/types/IFrameClientServicesHostOptions)</code>



## Properties
### [closed]()
Type: <code>Event&lt;undefined | Error&gt;</code>

The connection to the services provider was termintaed.

This should fire if the services disconnect unexpectedly or during a client reset.

### [descriptors]()
Type: <code>ServiceBundle&lt;[ClientServices](/api/@dxos/react-client/types/ClientServices)&gt;</code>



### [services]()
Type: <code>Partial&lt;[ClientServices](/api/@dxos/react-client/types/ClientServices)&gt;</code>




## Methods
### [close()]()




Returns: <code>Promise&lt;void&gt;</code>

Arguments: none




### [open()]()




Returns: <code>Promise&lt;void&gt;</code>

Arguments: none




