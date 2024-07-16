# Class `FakeAgentHostingProvider`
<sub>Declared in [packages/sdk/client/src/services/fake-agent-hosting-provider.ts:9](https://github.com/dxos/dxos/blob/ec4e715a1/packages/sdk/client/src/services/fake-agent-hosting-provider.ts#L9)</sub>




## Constructors
### [constructor(_throw)](https://github.com/dxos/dxos/blob/ec4e715a1/packages/sdk/client/src/services/fake-agent-hosting-provider.ts#L11)




Returns: <code>[FakeAgentHostingProvider](/api/@dxos/client/classes/FakeAgentHostingProvider)</code>

Arguments: 

`_throw`: <code>boolean</code>



## Properties


## Methods
### [createAgent(invitationCode, identityKey)](https://github.com/dxos/dxos/blob/ec4e715a1/packages/sdk/client/src/services/fake-agent-hosting-provider.ts#L13)




Returns: <code>Promise&lt;string&gt;</code>

Arguments: 

`invitationCode`: <code>string</code>

`identityKey`: <code>string</code>


### [destroyAgent(agentID)](https://github.com/dxos/dxos/blob/ec4e715a1/packages/sdk/client/src/services/fake-agent-hosting-provider.ts#L25)




Returns: <code>Promise&lt;boolean&gt;</code>

Arguments: 

`agentID`: <code>string</code>


### [getAgent(agentID)](https://github.com/dxos/dxos/blob/ec4e715a1/packages/sdk/client/src/services/fake-agent-hosting-provider.ts#L20)




Returns: <code>Promise&lt;"null" | string&gt;</code>

Arguments: 

`agentID`: <code>string</code>


### [init(authToken)](https://github.com/dxos/dxos/blob/ec4e715a1/packages/sdk/client/src/services/fake-agent-hosting-provider.ts#L30)


Initialize the client, potentially using the authToken to check authorization.

Returns: <code>boolean</code>

Arguments: 

`authToken`: <code>any</code>


