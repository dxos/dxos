# Class `IFrameClientServicesProxy`
<sub>Declared in [packages/sdk/client/src/packlets/client/iframe-service-proxy.ts:28](https://github.com/dxos/dxos/blob/main/packages/sdk/client/src/packlets/client/iframe-service-proxy.ts#L28)</sub>


Proxy to host client service via iframe.

## Constructors
### [constructor(options)](https://github.com/dxos/dxos/blob/main/packages/sdk/client/src/packlets/client/iframe-service-proxy.ts#L37)


Returns: <code>[IFrameClientServicesProxy](/api/@dxos/client/classes/IFrameClientServicesProxy)</code>

Arguments: 

`options`: <code>Partial&lt;[IFrameClientServicesProxyOptions](/api/@dxos/client/types/IFrameClientServicesProxyOptions)&gt;</code>

## Properties
### [joinedSpace](https://github.com/dxos/dxos/blob/main/packages/sdk/client/src/packlets/client/iframe-service-proxy.ts#L29)
Type: <code>Event&lt;[PublicKey](/api/@dxos/client/classes/PublicKey)&gt;</code>
### [contextUpdate](https://github.com/dxos/dxos/blob/main/packages/sdk/client/src/packlets/client/iframe-service-proxy.ts#L64)
Type: <code>undefined | Event&lt;AppContextRequest&gt;</code>
### [descriptors](https://github.com/dxos/dxos/blob/main/packages/sdk/client/src/packlets/client/iframe-service-proxy.ts#L52)
Type: <code>ServiceBundle&lt;ClientServices&gt;</code>
### [display](https://github.com/dxos/dxos/blob/main/packages/sdk/client/src/packlets/client/iframe-service-proxy.ts#L60)
Type: <code>undefined | [ShellDisplay](/api/@dxos/client/enums#ShellDisplay)</code>
### [proxy](https://github.com/dxos/dxos/blob/main/packages/sdk/client/src/packlets/client/iframe-service-proxy.ts#L48)
Type: <code>ProtoRpcPeer&lt;ClientServices&gt;</code>
### [services](https://github.com/dxos/dxos/blob/main/packages/sdk/client/src/packlets/client/iframe-service-proxy.ts#L56)
Type: <code>ClientServices</code>

## Methods
### [close()](https://github.com/dxos/dxos/blob/main/packages/sdk/client/src/packlets/client/iframe-service-proxy.ts#L129)


Returns: <code>Promise&lt;void&gt;</code>

Arguments: none
### [open()](https://github.com/dxos/dxos/blob/main/packages/sdk/client/src/packlets/client/iframe-service-proxy.ts#L76)


Returns: <code>Promise&lt;void&gt;</code>

Arguments: none
### [setLayout(layout, options)](https://github.com/dxos/dxos/blob/main/packages/sdk/client/src/packlets/client/iframe-service-proxy.ts#L72)


Returns: <code>Promise&lt;void&gt;</code>

Arguments: 

`layout`: <code>[ShellLayout](/api/@dxos/client/enums#ShellLayout)</code>

`options`: <code>Omit&lt;LayoutRequest, "layout"&gt;</code>
### [setSpaceProvider(provider)](https://github.com/dxos/dxos/blob/main/packages/sdk/client/src/packlets/client/iframe-service-proxy.ts#L68)


Returns: <code>void</code>

Arguments: 

`provider`: <code>Provider&lt;undefined | [PublicKey](/api/@dxos/client/classes/PublicKey)&gt;</code>