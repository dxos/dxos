# Class `AgentClientServiceProvider`
<sub>Declared in [packages/sdk/client/dist/types/src/services/agent.d.ts:12]()</sub>


Provide access to client services definitions and service handler.

## Constructors
### [constructor(_profile)]()




Returns: <code>[AgentClientServiceProvider](/api/@dxos/react-client/classes/AgentClientServiceProvider)</code>

Arguments: 

`_profile`: <code>string</code>



## Properties
### [closed]()
Type: <code>Event&lt;undefined | Error&gt;</code>

The connection to the services provider was terminated.
This should fire if the services disconnect unexpectedly or during a client reset.

### [descriptors]()
Type: <code>ServiceBundle&lt;[ClientServices](/api/@dxos/react-client/types/ClientServices)&gt;</code>



### [services]()
Type: <code>Partial&lt;[ClientServices](/api/@dxos/react-client/types/ClientServices)&gt;</code>




## Methods
### [close()]()




Returns: <code>Promise&lt;void&gt;</code>

Arguments: none




### [open()]()




Returns: <code>Promise&lt;void&gt;</code>

Arguments: none




