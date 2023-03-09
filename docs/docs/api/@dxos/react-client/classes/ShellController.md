# Class `ShellController`
<sub>Declared in [packages/sdk/client/dist/types/src/packlets/proxies/shell-controller.d.ts:7]()</sub>


Provide access to the shell via RPC connection.


## Constructors
### [constructor(_port)]()



Returns: <code>[ShellController](/api/@dxos/react-client/classes/ShellController)</code>

Arguments: 

`_port`: <code>RpcPort</code>


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
