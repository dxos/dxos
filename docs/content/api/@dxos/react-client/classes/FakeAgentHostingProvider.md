# Class `FakeAgentHostingProvider`
<sub>Declared in [packages/sdk/client/dist/types/src/services/fake-agent-hosting-provider.d.ts:2]()</sub>




## Constructors
### [constructor(\[_throw\])]()




Returns: <code>[FakeAgentHostingProvider](/api/@dxos/react-client/classes/FakeAgentHostingProvider)</code>

Arguments: 

`_throw`: <code>boolean</code>



## Properties


## Methods
### [createAgent(invitationCode, identityKey)]()




Returns: <code>Promise&lt;string&gt;</code>

Arguments: 

`invitationCode`: <code>string</code>

`identityKey`: <code>string</code>


### [destroyAgent(agentID)]()




Returns: <code>Promise&lt;boolean&gt;</code>

Arguments: 

`agentID`: <code>string</code>


### [getAgent(agentID)]()




Returns: <code>Promise&lt;"null" | string&gt;</code>

Arguments: 

`agentID`: <code>string</code>


### [init(authToken)]()


Initialize the client, potentially using the authToken to check authorization.

Returns: <code>boolean</code>

Arguments: 

`authToken`: <code>any</code>


