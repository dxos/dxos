# Class `ShellController`
<sub>Declared in [packages/sdk/client/src/packlets/proxies/shell-controller.ts:30](https://github.com/dxos/dxos/blob/main/packages/sdk/client/src/packlets/proxies/shell-controller.ts#L30)</sub>


Provide access to the shell via RPC connection.


## Constructors
### [constructor(_iframeController, _joinedSpace, _channel)](https://github.com/dxos/dxos/blob/main/packages/sdk/client/src/packlets/proxies/shell-controller.ts#L37)



Returns: <code>[ShellController](/api/@dxos/client/classes/ShellController)</code>

Arguments: 

`_iframeController`: <code>[IFrameController](/api/@dxos/client/classes/IFrameController)</code>

`_joinedSpace`: <code>Event&lt;[PublicKey](/api/@dxos/client/classes/PublicKey)&gt;</code>

`_channel`: <code>string</code>


## Properties
### [contextUpdate](https://github.com/dxos/dxos/blob/main/packages/sdk/client/src/packlets/proxies/shell-controller.ts#L31)
Type: <code>Event&lt;AppContextRequest&gt;</code>

### [display](https://github.com/dxos/dxos/blob/main/packages/sdk/client/src/packlets/proxies/shell-controller.ts#L45)
Type: <code>[ShellDisplay](/api/@dxos/client/enums#ShellDisplay)</code>


## Methods
### [close()](https://github.com/dxos/dxos/blob/main/packages/sdk/client/src/packlets/proxies/shell-controller.ts#L100)



Returns: <code>Promise&lt;void&gt;</code>

Arguments: none

### [open()](https://github.com/dxos/dxos/blob/main/packages/sdk/client/src/packlets/proxies/shell-controller.ts#L60)



Returns: <code>Promise&lt;void&gt;</code>

Arguments: none

### [setLayout(layout, options)](https://github.com/dxos/dxos/blob/main/packages/sdk/client/src/packlets/proxies/shell-controller.ts#L49)



Returns: <code>Promise&lt;void&gt;</code>

Arguments: 

`layout`: <code>[ShellLayout](/api/@dxos/client/enums#ShellLayout)</code>

`options`: <code>Omit&lt;LayoutRequest, "layout"&gt;</code>

### [setSpaceProvider(provider)](https://github.com/dxos/dxos/blob/main/packages/sdk/client/src/packlets/proxies/shell-controller.ts#L56)



Returns: <code>void</code>

Arguments: 

`provider`: <code>Provider&lt;undefined | [PublicKey](/api/@dxos/client/classes/PublicKey)&gt;</code>
