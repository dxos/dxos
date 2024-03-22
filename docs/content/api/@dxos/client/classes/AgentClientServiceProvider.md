# Class `AgentClientServiceProvider`
<sub>Declared in [packages/sdk/client/src/services/agent.ts:35](https://github.com/dxos/dxos/blob/235256b25/packages/sdk/client/src/services/agent.ts#L35)</sub>


Provide access to client services definitions and service handler.

## Constructors
### [constructor(_profile)](https://github.com/dxos/dxos/blob/235256b25/packages/sdk/client/src/services/agent.ts#L40)




Returns: <code>[AgentClientServiceProvider](/api/@dxos/client/classes/AgentClientServiceProvider)</code>

Arguments: 

`_profile`: <code>string</code>



## Properties
### [closed](https://github.com/dxos/dxos/blob/235256b25/packages/sdk/client/src/services/agent.ts#L37)
Type: <code>Event&lt;undefined | Error&gt;</code>

The connection to the services provider was termintaed.

This should fire if the services disconnect unexpectedly or during a client reset.

### [descriptors](https://github.com/dxos/dxos/blob/235256b25/packages/sdk/client/src/services/agent.ts#L42)
Type: <code>ServiceBundle&lt;[ClientServices](/api/@dxos/client/types/ClientServices)&gt;</code>



### [services](https://github.com/dxos/dxos/blob/235256b25/packages/sdk/client/src/services/agent.ts#L46)
Type: <code>Partial&lt;[ClientServices](/api/@dxos/client/types/ClientServices)&gt;</code>




## Methods
### [close()](https://github.com/dxos/dxos/blob/235256b25/packages/sdk/client/src/services/agent.ts#L62)




Returns: <code>Promise&lt;void&gt;</code>

Arguments: none




### [open()](https://github.com/dxos/dxos/blob/235256b25/packages/sdk/client/src/services/agent.ts#L50)




Returns: <code>Promise&lt;void&gt;</code>

Arguments: none




