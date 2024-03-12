# Class `ShellManager`
<sub>Declared in [packages/sdk/client/dist/types/src/services/shell-manager.d.ts:7]()</sub>


Provide access to the shell via RPC connection.

## Constructors
### [constructor(_iframeManager, \[_channel\])]()




Returns: <code>[ShellManager](/api/@dxos/react-client/classes/ShellManager)</code>

Arguments: 

`_iframeManager`: <code>[IFrameManager](/api/@dxos/react-client/classes/IFrameManager)</code>

`_channel`: <code>string</code>



## Properties
### [contextUpdate]()
Type: <code>Event&lt;[AppContextRequest](/api/@dxos/react-client/interfaces/AppContextRequest)&gt;</code>



### [display]()
Type: <code>[ShellDisplay](/api/@dxos/react-client/enums#ShellDisplay)</code>




## Methods
### [close()]()




Returns: <code>Promise&lt;void&gt;</code>

Arguments: none




### [open()]()




Returns: <code>Promise&lt;void&gt;</code>

Arguments: none




### [setLayout(request)]()




Returns: <code>Promise&lt;void&gt;</code>

Arguments: 

`request`: <code>[LayoutRequest](/api/@dxos/react-client/interfaces/LayoutRequest)</code>


