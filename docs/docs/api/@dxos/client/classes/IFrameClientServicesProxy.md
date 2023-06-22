# Class `IFrameClientServicesProxy`
<sub>Declared in [packages/sdk/client/src/packlets/client/iframe-service-proxy.ts:42](https://github.com/dxos/dxos/blob/main/packages/sdk/client/src/packlets/client/iframe-service-proxy.ts#L42)</sub>


Proxy to host client service via iframe.


## Constructors
### [constructor(options)](https://github.com/dxos/dxos/blob/main/packages/sdk/client/src/packlets/client/iframe-service-proxy.ts#L62)



Returns: <code>[IFrameClientServicesProxy](/api/@dxos/client/classes/IFrameClientServicesProxy)</code>

Arguments: 

`options`: <code>[IFrameClientServicesProxyOptions](/api/@dxos/client/types/IFrameClientServicesProxyOptions)</code>


## Properties
### [joinedSpace](https://github.com/dxos/dxos/blob/main/packages/sdk/client/src/packlets/client/iframe-service-proxy.ts#L43)
Type: <code>Event&lt;[PublicKey](/api/@dxos/client/classes/PublicKey)&gt;</code>

### [contextUpdate](https://github.com/dxos/dxos/blob/main/packages/sdk/client/src/packlets/client/iframe-service-proxy.ts#L134)
Type: <code>undefined | Event&lt;AppContextRequest&gt;</code>

### [descriptors](https://github.com/dxos/dxos/blob/main/packages/sdk/client/src/packlets/client/iframe-service-proxy.ts#L122)
Type: <code>ServiceBundle&lt;[ClientServices](/api/@dxos/client/types/ClientServices)&gt;</code>

### [display](https://github.com/dxos/dxos/blob/main/packages/sdk/client/src/packlets/client/iframe-service-proxy.ts#L130)
Type: <code>undefined | [ShellDisplay](/api/@dxos/client/enums#ShellDisplay)</code>

### [proxy](https://github.com/dxos/dxos/blob/main/packages/sdk/client/src/packlets/client/iframe-service-proxy.ts#L118)
Type: <code>ProtoRpcPeer&lt;[ClientServices](/api/@dxos/client/types/ClientServices)&gt;</code>

### [services](https://github.com/dxos/dxos/blob/main/packages/sdk/client/src/packlets/client/iframe-service-proxy.ts#L126)
Type: <code>Partial&lt;[ClientServices](/api/@dxos/client/types/ClientServices)&gt;</code>


## Methods
### [close()](https://github.com/dxos/dxos/blob/main/packages/sdk/client/src/packlets/client/iframe-service-proxy.ts#L200)



Returns: <code>Promise&lt;void&gt;</code>

Arguments: none

### [open()](https://github.com/dxos/dxos/blob/main/packages/sdk/client/src/packlets/client/iframe-service-proxy.ts#L146)



Returns: <code>Promise&lt;void&gt;</code>

Arguments: none

### [setLayout(layout, options)](https://github.com/dxos/dxos/blob/main/packages/sdk/client/src/packlets/client/iframe-service-proxy.ts#L142)



Returns: <code>Promise&lt;void&gt;</code>

Arguments: 

`layout`: <code>[ShellLayout](/api/@dxos/client/enums#ShellLayout)</code>

`options`: <code>Omit&lt;LayoutRequest, "layout"&gt;</code>

### [setSpaceProvider(provider)](https://github.com/dxos/dxos/blob/main/packages/sdk/client/src/packlets/client/iframe-service-proxy.ts#L138)



Returns: <code>void</code>

Arguments: 

`provider`: <code>Provider&lt;undefined | [PublicKey](/api/@dxos/client/classes/PublicKey)&gt;</code>
