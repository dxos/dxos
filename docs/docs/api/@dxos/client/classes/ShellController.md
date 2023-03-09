# Class `ShellController`
<sub>Declared in [packages/sdk/client/src/packlets/proxies/shell-controller.ts:15](https://github.com/dxos/dxos/blob/main/packages/sdk/client/src/packlets/proxies/shell-controller.ts#L15)</sub>


Provide access to the shell via RPC connection.


## Constructors
### [constructor(_port)](https://github.com/dxos/dxos/blob/main/packages/sdk/client/src/packlets/proxies/shell-controller.ts#L20)



Returns: <code>[ShellController](/api/@dxos/client/classes/ShellController)</code>

Arguments: 

`_port`: <code>RpcPort</code>


## Properties
### [contextUpdate](https://github.com/dxos/dxos/blob/main/packages/sdk/client/src/packlets/proxies/shell-controller.ts#L16)
Type: <code>Event&lt;AppContextRequest&gt;</code>

### [display](https://github.com/dxos/dxos/blob/main/packages/sdk/client/src/packlets/proxies/shell-controller.ts#L22)
Type: <code>[ShellDisplay](/api/@dxos/client/enums#ShellDisplay)</code>


## Methods
### [close()](https://github.com/dxos/dxos/blob/main/packages/sdk/client/src/packlets/proxies/shell-controller.ts#L52)



Returns: <code>Promise&lt;void&gt;</code>

Arguments: none

### [open()](https://github.com/dxos/dxos/blob/main/packages/sdk/client/src/packlets/proxies/shell-controller.ts#L33)



Returns: <code>Promise&lt;void&gt;</code>

Arguments: none

### [setLayout(layout, options)](https://github.com/dxos/dxos/blob/main/packages/sdk/client/src/packlets/proxies/shell-controller.ts#L26)



Returns: <code>Promise&lt;void&gt;</code>

Arguments: 

`layout`: <code>[ShellLayout](/api/@dxos/client/enums#ShellLayout)</code>

`options`: <code>Omit&lt;LayoutRequest, "layout"&gt;</code>
