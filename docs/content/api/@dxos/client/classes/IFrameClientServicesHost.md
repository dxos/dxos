# Class `IFrameClientServicesHost`
<sub>Declared in [packages/sdk/client/src/services/iframe-service-host.ts:36](https://github.com/dxos/dxos/blob/27607ac6b/packages/sdk/client/src/services/iframe-service-host.ts#L36)</sub>


Proxy to host client service via iframe.

## Constructors
### [constructor(options)](https://github.com/dxos/dxos/blob/27607ac6b/packages/sdk/client/src/services/iframe-service-host.ts#L48)




Returns: <code>[IFrameClientServicesHost](/api/@dxos/client/classes/IFrameClientServicesHost)</code>

Arguments: 

`options`: <code>[IFrameClientServicesHostOptions](/api/@dxos/client/types/IFrameClientServicesHostOptions)</code>



## Properties
### [closed](https://github.com/dxos/dxos/blob/27607ac6b/packages/sdk/client/src/services/iframe-service-host.ts#L37)
Type: <code>Event&lt;undefined | Error&gt;</code>

The connection to the services provider was termintaed.

This should fire if the services disconnect unexpectedly or during a client reset.

### [descriptors](https://github.com/dxos/dxos/blob/27607ac6b/packages/sdk/client/src/services/iframe-service-host.ts#L110)
Type: <code>ServiceBundle&lt;[ClientServices](/api/@dxos/client/types/ClientServices)&gt;</code>



### [services](https://github.com/dxos/dxos/blob/27607ac6b/packages/sdk/client/src/services/iframe-service-host.ts#L114)
Type: <code>Partial&lt;[ClientServices](/api/@dxos/client/types/ClientServices)&gt;</code>




## Methods
### [close()](https://github.com/dxos/dxos/blob/27607ac6b/packages/sdk/client/src/services/iframe-service-host.ts#L123)




Returns: <code>Promise&lt;void&gt;</code>

Arguments: none




### [open()](https://github.com/dxos/dxos/blob/27607ac6b/packages/sdk/client/src/services/iframe-service-host.ts#L118)




Returns: <code>Promise&lt;void&gt;</code>

Arguments: none




