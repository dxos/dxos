# Class `AgentClientServiceProvider`
<sub>Declared in [packages/sdk/client/src/services/agent.ts:38](https://github.com/dxos/dxos/blob/516b7546a/packages/sdk/client/src/services/agent.ts#L38)</sub>


Provide access to client services definitions and service handler.

## Constructors
### [constructor(_profile)](https://github.com/dxos/dxos/blob/516b7546a/packages/sdk/client/src/services/agent.ts#L43)




Returns: <code>[AgentClientServiceProvider](/api/@dxos/client/classes/AgentClientServiceProvider)</code>

Arguments: 

`_profile`: <code>string</code>



## Properties
### [closed](https://github.com/dxos/dxos/blob/516b7546a/packages/sdk/client/src/services/agent.ts#L40)
Type: <code>Event&lt;undefined | Error&gt;</code>

The connection to the services provider was terminated.
This should fire if the services disconnect unexpectedly or during a client reset.

### [descriptors](https://github.com/dxos/dxos/blob/516b7546a/packages/sdk/client/src/services/agent.ts#L45)
Type: <code>ServiceBundle&lt;[ClientServices](/api/@dxos/client/types/ClientServices)&gt;</code>



### [services](https://github.com/dxos/dxos/blob/516b7546a/packages/sdk/client/src/services/agent.ts#L49)
Type: <code>Partial&lt;[ClientServices](/api/@dxos/client/types/ClientServices)&gt;</code>




## Methods
### [close()](https://github.com/dxos/dxos/blob/516b7546a/packages/sdk/client/src/services/agent.ts#L68)




Returns: <code>Promise&lt;void&gt;</code>

Arguments: none




### [open()](https://github.com/dxos/dxos/blob/516b7546a/packages/sdk/client/src/services/agent.ts#L53)




Returns: <code>Promise&lt;void&gt;</code>

Arguments: none




