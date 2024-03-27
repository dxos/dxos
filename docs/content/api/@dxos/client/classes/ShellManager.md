# Class `ShellManager`
<sub>Declared in [packages/sdk/client/src/services/shell-manager.ts:33](https://github.com/dxos/dxos/blob/29a91026f/packages/sdk/client/src/services/shell-manager.ts#L33)</sub>


Provide access to the shell via RPC connection.

## Constructors
### [constructor(_iframeManager, _channel)](https://github.com/dxos/dxos/blob/29a91026f/packages/sdk/client/src/services/shell-manager.ts#L40)




Returns: <code>[ShellManager](/api/@dxos/client/classes/ShellManager)</code>

Arguments: 

`_iframeManager`: <code>[IFrameManager](/api/@dxos/client/classes/IFrameManager)</code>

`_channel`: <code>string</code>



## Properties
### [contextUpdate](https://github.com/dxos/dxos/blob/29a91026f/packages/sdk/client/src/services/shell-manager.ts#L34)
Type: <code>Event&lt;[AppContextRequest](/api/@dxos/client/interfaces/AppContextRequest)&gt;</code>



### [display](https://github.com/dxos/dxos/blob/29a91026f/packages/sdk/client/src/services/shell-manager.ts#L45)
Type: <code>[ShellDisplay](/api/@dxos/client/enums#ShellDisplay)</code>




## Methods
### [close()](https://github.com/dxos/dxos/blob/29a91026f/packages/sdk/client/src/services/shell-manager.ts#L111)




Returns: <code>Promise&lt;void&gt;</code>

Arguments: none




### [open()](https://github.com/dxos/dxos/blob/29a91026f/packages/sdk/client/src/services/shell-manager.ts#L56)




Returns: <code>Promise&lt;void&gt;</code>

Arguments: none




### [setLayout(request)](https://github.com/dxos/dxos/blob/29a91026f/packages/sdk/client/src/services/shell-manager.ts#L49)




Returns: <code>Promise&lt;void&gt;</code>

Arguments: 

`request`: <code>[LayoutRequest](/api/@dxos/client/interfaces/LayoutRequest)</code>


