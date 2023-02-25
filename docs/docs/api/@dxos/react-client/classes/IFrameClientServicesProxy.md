# Class `IFrameClientServicesProxy`
<sub>Declared in [packages/sdk/client/dist/types/src/packlets/client/iframe-service-proxy.d.ts:15]()</sub>


Proxy to host client service via iframe.

## Constructors
### [constructor(\[options\])]()


Returns: <code>[IFrameClientServicesProxy](/api/@dxos/react-client/classes/IFrameClientServicesProxy)</code>

Arguments: 

`options`: <code>Partial&lt;[IFrameClientServicesProxyOptions](/api/@dxos/react-client/types/IFrameClientServicesProxyOptions)&gt;</code>

## Properties
### [joinedSpace]()
Type: <code>Event&lt;[PublicKey](/api/@dxos/react-client/classes/PublicKey)&gt;</code>
### [contextUpdate]()
Type: <code>undefined | Event&lt;AppContextRequest&gt;</code>
### [descriptors]()
Type: <code>ServiceBundle&lt;ClientServices&gt;</code>
### [display]()
Type: <code>undefined | [ShellDisplay](/api/@dxos/react-client/enums#ShellDisplay)</code>
### [proxy]()
Type: <code>ProtoRpcPeer&lt;ClientServices&gt;</code>
### [services]()
Type: <code>ClientServices</code>

## Methods
### [close()]()


Returns: <code>Promise&lt;void&gt;</code>

Arguments: none
### [open()]()


Returns: <code>Promise&lt;void&gt;</code>

Arguments: none
### [setLayout(layout, \[options\])]()


Returns: <code>Promise&lt;void&gt;</code>

Arguments: 

`layout`: <code>[ShellLayout](/api/@dxos/react-client/enums#ShellLayout)</code>

`options`: <code>Omit&lt;LayoutRequest, "layout"&gt;</code>
### [setSpaceProvider(provider)]()


Returns: <code>void</code>

Arguments: 

`provider`: <code>Provider&lt;undefined | [PublicKey](/api/@dxos/react-client/classes/PublicKey)&gt;</code>