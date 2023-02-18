# Class `IFrameClientServicesProxy`
<sub>Declared in [packages/sdk/client/src/packlets/client/iframe-service-proxy.ts:26](https://github.com/dxos/dxos/blob/main/packages/sdk/client/src/packlets/client/iframe-service-proxy.ts#L26)</sub>


Proxy to host client service via iframe.

## Constructors
### [constructor(options)](https://github.com/dxos/dxos/blob/main/packages/sdk/client/src/packlets/client/iframe-service-proxy.ts#L32)


Returns: <code>[IFrameClientServicesProxy](/api/@dxos/client/classes/IFrameClientServicesProxy)</code>

Arguments: 

`options`: <code>Partial&lt;[IFrameClientServicesProxyOptions](/api/@dxos/client/types/IFrameClientServicesProxyOptions)&gt;</code>

## Properties
### [contextUpdate](https://github.com/dxos/dxos/blob/main/packages/sdk/client/src/packlets/client/iframe-service-proxy.ts#L63)
Type: <code>undefined | Event&lt;AppContextRequest&gt;</code>
### [descriptors](https://github.com/dxos/dxos/blob/main/packages/sdk/client/src/packlets/client/iframe-service-proxy.ts#L47)
Type: <code>ServiceBundle&lt;ClientServices&gt;</code>
### [display](https://github.com/dxos/dxos/blob/main/packages/sdk/client/src/packlets/client/iframe-service-proxy.ts#L55)
Type: <code>undefined | [ShellDisplay](/api/@dxos/client/enums#ShellDisplay)</code>
### [proxy](https://github.com/dxos/dxos/blob/main/packages/sdk/client/src/packlets/client/iframe-service-proxy.ts#L43)
Type: <code>ProtoRpcPeer&lt;ClientServices&gt;</code>
### [services](https://github.com/dxos/dxos/blob/main/packages/sdk/client/src/packlets/client/iframe-service-proxy.ts#L51)
Type: <code>ClientServices</code>
### [spaceKey](https://github.com/dxos/dxos/blob/main/packages/sdk/client/src/packlets/client/iframe-service-proxy.ts#L59)
Type: <code>undefined | [PublicKey](/api/@dxos/client/classes/PublicKey)</code>

## Methods
### [close()](https://github.com/dxos/dxos/blob/main/packages/sdk/client/src/packlets/client/iframe-service-proxy.ts#L125)


Returns: <code>Promise&lt;void&gt;</code>

Arguments: none
### [open()](https://github.com/dxos/dxos/blob/main/packages/sdk/client/src/packlets/client/iframe-service-proxy.ts#L75)


Returns: <code>Promise&lt;void&gt;</code>

Arguments: none
### [setCurrentSpace(\[key\])](https://github.com/dxos/dxos/blob/main/packages/sdk/client/src/packlets/client/iframe-service-proxy.ts#L71)


Returns: <code>void</code>

Arguments: 

`key`: <code>[PublicKey](/api/@dxos/client/classes/PublicKey)</code>
### [setLayout(layout, options)](https://github.com/dxos/dxos/blob/main/packages/sdk/client/src/packlets/client/iframe-service-proxy.ts#L67)


Returns: <code>Promise&lt;void&gt;</code>

Arguments: 

`layout`: <code>[ShellLayout](/api/@dxos/client/enums#ShellLayout)</code>

`options`: <code>Omit&lt;LayoutRequest, "layout"&gt;</code>