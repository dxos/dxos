# Class `ShellController`
<sub>Declared in [packages/sdk/client/dist/types/src/packlets/proxies/shell-controller.d.ts:9]()</sub>


Provide access to the shell via RPC connection.


## Constructors
### [constructor(_iframeController, _joinedSpace, \[_channel\])]()



Returns: <code>[ShellController](/api/@dxos/react-client/classes/ShellController)</code>

Arguments: 

`_iframeController`: <code>[IFrameController](/api/@dxos/react-client/classes/IFrameController)</code>

`_joinedSpace`: <code>Event&lt;[PublicKey](/api/@dxos/react-client/classes/PublicKey)&gt;</code>

`_channel`: <code>string</code>


## Properties
### [contextUpdate]()
Type: <code>Event&lt;AppContextRequest&gt;</code>

### [display]()
Type: <code>[ShellDisplay](/api/@dxos/react-client/enums#ShellDisplay)</code>


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
