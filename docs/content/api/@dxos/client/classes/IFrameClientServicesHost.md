# Class `IFrameClientServicesHost`
<sub>Declared in [packages/sdk/client/src/services/iframe-service-host.ts:35](https://github.com/dxos/dxos/blob/516b7546a/packages/sdk/client/src/services/iframe-service-host.ts#L35)</sub>


Proxy to host client service via iframe.

## Constructors
### [constructor(options)](https://github.com/dxos/dxos/blob/516b7546a/packages/sdk/client/src/services/iframe-service-host.ts#L47)




Returns: <code>[IFrameClientServicesHost](/api/@dxos/client/classes/IFrameClientServicesHost)</code>

Arguments: 

`options`: <code>[IFrameClientServicesHostOptions](/api/@dxos/client/types/IFrameClientServicesHostOptions)</code>



## Properties
### [closed](https://github.com/dxos/dxos/blob/516b7546a/packages/sdk/client/src/services/iframe-service-host.ts#L36)
Type: <code>Event&lt;undefined | Error&gt;</code>

The connection to the services provider was terminated.
This should fire if the services disconnect unexpectedly or during a client reset.

### [descriptors](https://github.com/dxos/dxos/blob/516b7546a/packages/sdk/client/src/services/iframe-service-host.ts#L109)
Type: <code>ServiceBundle&lt;[ClientServices](/api/@dxos/client/types/ClientServices)&gt;</code>



### [services](https://github.com/dxos/dxos/blob/516b7546a/packages/sdk/client/src/services/iframe-service-host.ts#L113)
Type: <code>Partial&lt;[ClientServices](/api/@dxos/client/types/ClientServices)&gt;</code>




## Methods
### [close()](https://github.com/dxos/dxos/blob/516b7546a/packages/sdk/client/src/services/iframe-service-host.ts#L122)




Returns: <code>Promise&lt;void&gt;</code>

Arguments: none




### [open()](https://github.com/dxos/dxos/blob/516b7546a/packages/sdk/client/src/services/iframe-service-host.ts#L117)




Returns: <code>Promise&lt;void&gt;</code>

Arguments: none




