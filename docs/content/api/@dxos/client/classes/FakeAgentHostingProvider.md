# Class `FakeAgentHostingProvider`
<sub>Declared in [packages/sdk/client/src/services/fake-agent-hosting-provider.ts:10](https://github.com/dxos/dxos/blob/061d3392e/packages/sdk/client/src/services/fake-agent-hosting-provider.ts#L10)</sub>




## Constructors
### [constructor(_clientConfig, _halo)](https://github.com/dxos/dxos/blob/061d3392e/packages/sdk/client/src/services/fake-agent-hosting-provider.ts#L12)




Returns: <code>[FakeAgentHostingProvider](/api/@dxos/client/classes/FakeAgentHostingProvider)</code>

Arguments: 

`_clientConfig`: <code>[Config](/api/@dxos/react-client/classes/Config)</code>

`_halo`: <code>[Halo](/api/@dxos/client/interfaces/Halo)</code>



## Properties


## Methods
### [createAgent(invitationCode, identityKey)](https://github.com/dxos/dxos/blob/061d3392e/packages/sdk/client/src/services/fake-agent-hosting-provider.ts#L17)




Returns: <code>Promise&lt;string&gt;</code>

Arguments: 

`invitationCode`: <code>string</code>

`identityKey`: <code>string</code>


### [destroyAgent(agentID)](https://github.com/dxos/dxos/blob/061d3392e/packages/sdk/client/src/services/fake-agent-hosting-provider.ts#L27)




Returns: <code>Promise&lt;boolean&gt;</code>

Arguments: 

`agentID`: <code>string</code>


### [getAgent(agentID)](https://github.com/dxos/dxos/blob/061d3392e/packages/sdk/client/src/services/fake-agent-hosting-provider.ts#L23)




Returns: <code>Promise&lt;"null" | string&gt;</code>

Arguments: 

`agentID`: <code>string</code>


### [init(authToken)](https://github.com/dxos/dxos/blob/061d3392e/packages/sdk/client/src/services/fake-agent-hosting-provider.ts#L31)


Initialize the client, potentially using the authToken to check authorization.

Returns: <code>boolean</code>

Arguments: 

`authToken`: <code>any</code>


