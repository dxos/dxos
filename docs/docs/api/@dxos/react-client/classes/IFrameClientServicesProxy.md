# Class `IFrameClientServicesProxy`
<sub>Declared in [packages/sdk/client/dist/types/src/services/iframe-service-proxy.d.ts:19]()</sub>


Proxy to host client service via iframe.

## Constructors
### [constructor(\[options\])]()




Returns: <code>[IFrameClientServicesProxy](/api/@dxos/react-client/classes/IFrameClientServicesProxy)</code>

Arguments: 

`options`: <code>[IFrameClientServicesProxyOptions](/api/@dxos/react-client/types/IFrameClientServicesProxyOptions)</code>



## Properties
### [invalidatedInvitationCode]()
Type: <code>Event&lt;string&gt;</code>



### [joinedSpace]()
Type: <code>Event&lt;[PublicKey](/api/@dxos/react-client/classes/PublicKey)&gt;</code>



### [contextUpdate]()
Type: <code>undefined | Event&lt;[AppContextRequest](/api/@dxos/react-client/interfaces/AppContextRequest)&gt;</code>



### [descriptors]()
Type: <code>ServiceBundle&lt;[ClientServices](/api/@dxos/react-client/types/ClientServices)&gt;</code>



### [display]()
Type: <code>undefined | [ShellDisplay](/api/@dxos/react-client/enums#ShellDisplay)</code>



### [proxy]()
Type: <code>ProtoRpcPeer&lt;[ClientServices](/api/@dxos/react-client/types/ClientServices)&gt;</code>



### [services]()
Type: <code>Partial&lt;[ClientServices](/api/@dxos/react-client/types/ClientServices)&gt;</code>




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

`options`: <code>Omit&lt;[LayoutRequest](/api/@dxos/react-client/interfaces/LayoutRequest), "layout"&gt;</code>


### [setSpaceProvider(provider)]()




Returns: <code>void</code>

Arguments: 

`provider`: <code>Provider&lt;undefined | [PublicKey](/api/@dxos/react-client/classes/PublicKey)&gt;</code>


