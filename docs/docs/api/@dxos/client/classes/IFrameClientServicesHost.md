# Class `IFrameClientServicesHost`
<sub>Declared in [packages/sdk/client/src/packlets/client/iframe-service-host.ts:31](https://github.com/dxos/dxos/blob/main/packages/sdk/client/src/packlets/client/iframe-service-host.ts#L31)</sub>


Provide access to client services definitions and service handler.


## Constructors
### [constructor(options)](https://github.com/dxos/dxos/blob/main/packages/sdk/client/src/packlets/client/iframe-service-host.ts#L40)



Returns: <code>[IFrameClientServicesHost](/api/@dxos/client/classes/IFrameClientServicesHost)</code>

Arguments: 

`options`: <code>[IFrameClientServicesHostOptions](/api/@dxos/client/types/IFrameClientServicesHostOptions)</code>


## Properties
### [joinedSpace](https://github.com/dxos/dxos/blob/main/packages/sdk/client/src/packlets/client/iframe-service-host.ts#L32)
Type: <code>Event&lt;[PublicKey](/api/@dxos/client/classes/PublicKey)&gt;</code>

### [contextUpdate](https://github.com/dxos/dxos/blob/main/packages/sdk/client/src/packlets/client/iframe-service-host.ts#L64)
Type: <code>Event&lt;AppContextRequest&gt;</code>

### [descriptors](https://github.com/dxos/dxos/blob/main/packages/sdk/client/src/packlets/client/iframe-service-host.ts#L52)
Type: <code>ServiceBundle&lt;[ClientServices](/api/@dxos/client/types/ClientServices)&gt;</code>

### [display](https://github.com/dxos/dxos/blob/main/packages/sdk/client/src/packlets/client/iframe-service-host.ts#L60)
Type: <code>[ShellDisplay](/api/@dxos/client/enums#ShellDisplay)</code>

### [services](https://github.com/dxos/dxos/blob/main/packages/sdk/client/src/packlets/client/iframe-service-host.ts#L56)
Type: <code>Partial&lt;[ClientServices](/api/@dxos/client/types/ClientServices)&gt;</code>


## Methods
### [close()](https://github.com/dxos/dxos/blob/main/packages/sdk/client/src/packlets/client/iframe-service-host.ts#L146)



Returns: <code>Promise&lt;void&gt;</code>

Arguments: none

### [open()](https://github.com/dxos/dxos/blob/main/packages/sdk/client/src/packlets/client/iframe-service-host.ts#L76)



Returns: <code>Promise&lt;void&gt;</code>

Arguments: none

### [setLayout(layout, options)](https://github.com/dxos/dxos/blob/main/packages/sdk/client/src/packlets/client/iframe-service-host.ts#L72)



Returns: <code>Promise&lt;void&gt;</code>

Arguments: 

`layout`: <code>[ShellLayout](/api/@dxos/client/enums#ShellLayout)</code>

`options`: <code>Omit&lt;LayoutRequest, "layout"&gt;</code>

### [setSpaceProvider(provider)](https://github.com/dxos/dxos/blob/main/packages/sdk/client/src/packlets/client/iframe-service-host.ts#L68)



Returns: <code>void</code>

Arguments: 

`provider`: <code>Provider&lt;undefined | [PublicKey](/api/@dxos/client/classes/PublicKey)&gt;</code>
