# Class `ShellManager`
<sub>Declared in [packages/sdk/client/src/services/shell-manager.ts:40](https://github.com/dxos/dxos/blob/d7adf231c/packages/sdk/client/src/services/shell-manager.ts#L40)</sub>


Provide access to the shell via RPC connection.

## Constructors
### [constructor(_iframeManager, _channel)](https://github.com/dxos/dxos/blob/d7adf231c/packages/sdk/client/src/services/shell-manager.ts#L47)




Returns: <code>[ShellManager](/api/@dxos/client/classes/ShellManager)</code>

Arguments: 

`_iframeManager`: <code>[IFrameManager](/api/@dxos/client/classes/IFrameManager)</code>

`_channel`: <code>string</code>



## Properties
### [contextUpdate](https://github.com/dxos/dxos/blob/d7adf231c/packages/sdk/client/src/services/shell-manager.ts#L41)
Type: <code>Event&lt;[AppContextRequest](/api/@dxos/client/interfaces/AppContextRequest)&gt;</code>



### [display](https://github.com/dxos/dxos/blob/d7adf231c/packages/sdk/client/src/services/shell-manager.ts#L52)
Type: <code>[ShellDisplay](/api/@dxos/client/enums#ShellDisplay)</code>




## Methods
### [close()](https://github.com/dxos/dxos/blob/d7adf231c/packages/sdk/client/src/services/shell-manager.ts#L124)




Returns: <code>Promise&lt;void&gt;</code>

Arguments: none




### [open()](https://github.com/dxos/dxos/blob/d7adf231c/packages/sdk/client/src/services/shell-manager.ts#L69)




Returns: <code>Promise&lt;void&gt;</code>

Arguments: none




### [setInvitationUrl(request)](https://github.com/dxos/dxos/blob/d7adf231c/packages/sdk/client/src/services/shell-manager.ts#L64)




Returns: <code>Promise&lt;void&gt;</code>

Arguments: 

`request`: <code>[InvitationUrlRequest](/api/@dxos/client/interfaces/InvitationUrlRequest)</code>


### [setLayout(request)](https://github.com/dxos/dxos/blob/d7adf231c/packages/sdk/client/src/services/shell-manager.ts#L56)




Returns: <code>Promise&lt;void&gt;</code>

Arguments: 

`request`: <code>[LayoutRequest](/api/@dxos/client/interfaces/LayoutRequest)</code>


