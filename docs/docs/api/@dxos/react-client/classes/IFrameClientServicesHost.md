# Class `IFrameClientServicesHost`
<sub>Declared in [packages/sdk/client/dist/types/src/packlets/client/iframe-service-host.d.ts:14]()</sub>


Provide access to client services definitions and service handler.


## Constructors
### [constructor(options)]()



Returns: <code>[IFrameClientServicesHost](/api/@dxos/react-client/classes/IFrameClientServicesHost)</code>

Arguments: 

`options`: <code>[IFrameClientServicesHostOptions](/api/@dxos/react-client/types/IFrameClientServicesHostOptions)</code>


## Properties
### [joinedSpace]()
Type: <code>Event&lt;[PublicKey](/api/@dxos/react-client/classes/PublicKey)&gt;</code>

### [contextUpdate]()
Type: <code>Event&lt;AppContextRequest&gt;</code>

### [descriptors]()
Type: <code>ServiceBundle&lt;[ClientServices](/api/@dxos/react-client/types/ClientServices)&gt;</code>

### [display]()
Type: <code>[ShellDisplay](/api/@dxos/react-client/enums#ShellDisplay)</code>

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

`options`: <code>Omit&lt;LayoutRequest, "layout"&gt;</code>

### [setSpaceProvider(provider)]()



Returns: <code>void</code>

Arguments: 

`provider`: <code>Provider&lt;undefined | [PublicKey](/api/@dxos/react-client/classes/PublicKey)&gt;</code>
