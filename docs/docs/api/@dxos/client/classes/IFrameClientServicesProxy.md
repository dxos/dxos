# Class `IFrameClientServicesProxy`
<sub>Declared in [packages/sdk/client/src/packlets/client/iframe-service-proxy.ts:47](https://github.com/dxos/dxos/blob/main/packages/sdk/client/src/packlets/client/iframe-service-proxy.ts#L47)</sub>


Proxy to host client service via iframe.


## Constructors
### [constructor(options)](https://github.com/dxos/dxos/blob/main/packages/sdk/client/src/packlets/client/iframe-service-proxy.ts#L61)



Returns: <code>[IFrameClientServicesProxy](/api/@dxos/client/classes/IFrameClientServicesProxy)</code>

Arguments: 

`options`: <code>Partial&lt;[IFrameClientServicesProxyOptions](/api/@dxos/client/types/IFrameClientServicesProxyOptions)&gt;</code>


## Properties
### [joinedSpace](https://github.com/dxos/dxos/blob/main/packages/sdk/client/src/packlets/client/iframe-service-proxy.ts#L48)
Type: <code>Event&lt;[PublicKey](/api/@dxos/client/classes/PublicKey)&gt;</code>

### [contextUpdate](https://github.com/dxos/dxos/blob/main/packages/sdk/client/src/packlets/client/iframe-service-proxy.ts#L88)
Type: <code>undefined | Event&lt;AppContextRequest&gt;</code>

### [descriptors](https://github.com/dxos/dxos/blob/main/packages/sdk/client/src/packlets/client/iframe-service-proxy.ts#L76)
Type: <code>ServiceBundle&lt;[ClientServices](/api/@dxos/client/types/ClientServices)&gt;</code>

### [display](https://github.com/dxos/dxos/blob/main/packages/sdk/client/src/packlets/client/iframe-service-proxy.ts#L84)
Type: <code>undefined | [ShellDisplay](/api/@dxos/client/enums#ShellDisplay)</code>

### [proxy](https://github.com/dxos/dxos/blob/main/packages/sdk/client/src/packlets/client/iframe-service-proxy.ts#L72)
Type: <code>ProtoRpcPeer&lt;[ClientServices](/api/@dxos/client/types/ClientServices)&gt;</code>

### [services](https://github.com/dxos/dxos/blob/main/packages/sdk/client/src/packlets/client/iframe-service-proxy.ts#L80)
Type: <code>[ClientServices](/api/@dxos/client/types/ClientServices)</code>


## Methods
### [close()](https://github.com/dxos/dxos/blob/main/packages/sdk/client/src/packlets/client/iframe-service-proxy.ts#L144)



Returns: <code>Promise&lt;void&gt;</code>

Arguments: none

### [open()](https://github.com/dxos/dxos/blob/main/packages/sdk/client/src/packlets/client/iframe-service-proxy.ts#L100)



Returns: <code>Promise&lt;void&gt;</code>

Arguments: none

### [setLayout(layout, options)](https://github.com/dxos/dxos/blob/main/packages/sdk/client/src/packlets/client/iframe-service-proxy.ts#L96)



Returns: <code>Promise&lt;void&gt;</code>

Arguments: 

`layout`: <code>[ShellLayout](/api/@dxos/client/enums#ShellLayout)</code>

`options`: <code>Omit&lt;LayoutRequest, "layout"&gt;</code>

### [setSpaceProvider(provider)](https://github.com/dxos/dxos/blob/main/packages/sdk/client/src/packlets/client/iframe-service-proxy.ts#L92)



Returns: <code>void</code>

Arguments: 

`provider`: <code>Provider&lt;undefined | [PublicKey](/api/@dxos/client/classes/PublicKey)&gt;</code>
